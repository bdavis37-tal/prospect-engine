import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import sample from "../src/data/demos/permian/analysis.json" with { type: "json" };
import { DECISION_LABELS } from "../src/lib/constants";

for (const legacy of [false, true])
  test(`a ${legacy ? "legacy" : "revisioned"} draft preserves newer saved edits`, async ({
    page,
    request,
  }) => {
    await page.goto("/");
    await page
      .getByRole("button", { name: "New portfolio", exact: true })
      .click();
    const name = page.getByLabel("Portfolio name", { exact: true });
    await name.fill("Shared budget");
    const created = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/portfolios") && r.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Save", exact: true }).click();
    const original = await (await created).json();
    await expect(page.getByText(/Saved revision 1/)).toBeVisible();
    await name.fill("Local budget edit");
    const newer = await request.put(`/api/portfolios/${original.id}`, {
      headers: { "X-Requested-With": "prospect-engine" },
      data: {
        input: { ...original.input, name: "Newer saved budget" },
        revision: 1,
      },
    });
    expect(newer.ok()).toBe(true);

    if (legacy) {
      const { workspace_id } = await (await request.get("/api/auth/me")).json();
      await page.evaluate((key) => {
        const d = JSON.parse(localStorage.getItem(key)!);
        delete d.baseRevision;
        localStorage.setItem(key, JSON.stringify(d));
      }, `prospect-draft:${workspace_id}`);
    }
    await page.reload();
    await expect(name).toHaveValue("Newer saved budget");
    await expect(
      page.getByRole("button", { name: "Run analysis", exact: true }),
    ).toBeDisabled();
    await page.getByRole("button", { name: "Recover draft as a copy" }).click();
    await expect(name).toHaveValue("Local budget edit (recovered copy)");
    const copied = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/portfolios") && r.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Save", exact: true }).click();
    expect((await (await copied).json()).id).not.toBe(original.id);
    const records = await (await request.get("/api/portfolios")).json();
    expect(records).toContainEqual(
      expect.objectContaining({
        id: original.id,
        revision: 2,
        name: "Newer saved budget",
      }),
    );
  });

test("importing JSON starts a new workspace and ignores a foreign job in a legacy draft", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "New portfolio", exact: true })
    .click();
  const submitted = page.waitForResponse(
    (r) => r.url().endsWith("/api/jobs") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Run analysis", exact: true }).click();
  const job = await (await submitted).json();
  await expect(
    page.getByRole("heading", { name: "Recommended allocation" }),
  ).toBeVisible({ timeout: 80000 });
  await page.getByRole("button", { name: "Prospects", exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "portfolio.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({ ...sample.input, name: "Imported asset pool" }),
    ),
  });
  const name = page.getByLabel("Portfolio name", { exact: true });
  await expect(name).toHaveValue("Imported asset pool");
  const { workspace_id } = await (await request.get("/api/auth/me")).json();
  const key = `prospect-draft:${workspace_id}`;
  const draft = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    key,
  );
  expect(draft.jobId).toBeUndefined();
  expect(draft.savedId).not.toBe(job.portfolio_id);
  await page.evaluate(
    ({ key, draft, jobId }) =>
      localStorage.setItem(key, JSON.stringify({ ...draft, jobId })),
    { key, draft, jobId: job.id },
  );
  await page.reload();
  await expect(name).toHaveValue("Imported asset pool");
  await expect(
    page.getByRole("button", { name: "Run analysis", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Reports", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Export full run" }),
  ).toBeDisabled();
});

test("the downloaded CSV template imports under the production content security policy", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "New portfolio", exact: true })
    .click();
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV template" }).click();
  const download = await downloading;
  await page.locator('input[type="file"]').setInputFiles({
    name: download.suggestedFilename(),
    mimeType: "text/csv",
    buffer: await readFile((await download.path())!),
  });
  await expect(
    page.getByRole("button", { name: "Example prospect", exact: true }),
  ).toBeVisible();
});

test("selecting a frontier alternative compares its economics and changed decisions", async ({
  page,
}) => {
  const { efficient_frontier, recommended_portfolio: rec } =
    sample.scenario_comparison.scenario_results[0].optimization_result;
  const ids = Object.keys(rec.allocation) as (keyof typeof rec.allocation)[];
  const index = efficient_frontier.findIndex((p) =>
    ids.some((id) => p.allocation[id] !== rec.allocation[id]),
  );
  expect(index).toBeGreaterThanOrEqual(0);
  const alt = efficient_frontier[index];
  await page.goto("/");
  await page
    .getByRole("button", { name: /Delaware \/ Midland Permian Basin/ })
    .click();
  await page
    .getByRole("button", { name: new RegExp(`^Allocation ${index + 1}\\b`) })
    .click();
  const comparison = page.getByRole("region", {
    name: "Allocation comparison",
  });
  const dollars = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);
  for (const [label, key] of [
    ["Expected NPV", "expected_npv"],
    ["Expected loss", "expected_loss"],
    ["Capital deployed", "capital_deployed"],
  ] as const) {
    const diff = alt[key] - rec[key];
    await expect(
      comparison
        .getByRole("row")
        .filter({
          has: page.getByRole("rowheader", { name: label, exact: true }),
        })
        .getByRole("cell"),
    ).toHaveText([
      dollars(rec[key]),
      dollars(alt[key]),
      (diff > 0 ? "+" : "") + dollars(diff),
    ]);
  }
  const changed = ids.filter((id) => rec.allocation[id] !== alt.allocation[id]);
  const table = comparison.getByRole("table", {
    name: "Changed prospect decisions",
  });
  await expect(table.getByRole("row")).toHaveCount(changed.length + 1);
  for (const id of changed) {
    const name = sample.input.prospects.find((p) => p.prospect_id === id)!.name;
    await expect(
      table
        .getByRole("row")
        .filter({ has: page.getByRole("rowheader", { name, exact: true }) })
        .getByRole("cell"),
    ).toHaveText([
      DECISION_LABELS[rec.allocation[id]],
      DECISION_LABELS[alt.allocation[id]],
    ]);
  }
  await comparison.screenshot({ path: "test-results/frontier-comparison.png" });
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await expect(comparison).toBeVisible();
  await expect(page.getByText(/Selected to maximize/)).toHaveCount(0);
  await page.getByRole("button", { name: "Allocation", exact: true }).click();
  await page.getByRole("button", { name: "Reset to recommendation" }).click();
  await expect(comparison).toHaveCount(0);
});
