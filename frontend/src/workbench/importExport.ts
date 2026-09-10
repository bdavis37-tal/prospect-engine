import { csvParse, csvParseRows, csvFormat } from "d3";
import type { PortfolioInput, Prospect } from "../types/api.generated";
import { basins, newProspect } from "./defaults";
import { download } from "./api";

export function importProspects(text: string): {
  prospects: Prospect[];
  errors: string[];
} {
  const rows = csvParse(text),
    errors: string[] = [],
    prospects: Prospect[] = [];
  if (rows.length === 0)
    return { prospects: [], errors: ["CSV contains no prospect rows."] };
  if (new Set(rows.columns).size !== rows.columns.length)
    return { prospects: [], errors: ["CSV contains duplicate column names."] };
  const rawRows = csvParseRows(text);
  if (rawRows.some((r) => r.length !== rows.columns.length))
    return {
      prospects: [],
      errors: [
        "CSV row lengths differ from the header. Check delimiters and quotes.",
      ],
    };
  if (rows.length > 40)
    return { prospects: [], errors: ["Maximum 40 prospects per portfolio."] };
  if (!rows.columns.includes("name") || !rows.columns.includes("basin"))
    return {
      prospects: [],
      errors: ["Required columns: name, basin. Download the CSV template."],
    };
  rows.forEach((r, index) => {
    const row = index + 2;
    if (!r.name?.trim()) {
      errors.push(`Row ${row}: name is required.`);
      return;
    }
    if (!basins.includes(r.basin as Prospect["basin"])) {
      errors.push(`Row ${row}: unknown basin ${r.basin}.`);
      return;
    }
    const p = newProspect(r.basin as Prospect["basin"]);
    p.name = r.name;
    const number = (key: string, fallback: number) => {
      if (!r[key]?.trim()) return fallback;
      const v = Number(r[key]);
      if (!Number.isFinite(v))
        errors.push(`Row ${row}: ${key} must be a number.`);
      return v;
    };
    p.latitude = number("latitude", p.latitude);
    p.longitude = number("longitude", p.longitude);
    p.resource_estimate.p90 = number("resource_p90", p.resource_estimate.p90);
    p.resource_estimate.p50 = number("resource_p50", p.resource_estimate.p50);
    p.resource_estimate.p10 = number("resource_p10", p.resource_estimate.p10);
    p.well_cost.base = number("well_cost", p.well_cost.base);
    p.well_cost.low = p.well_cost.base * 0.8;
    p.well_cost.high = p.well_cost.base * 1.2;
    p.completion_cost.base = number("completion_cost", p.completion_cost.base);
    p.completion_cost.low = p.completion_cost.base * 0.8;
    p.completion_cost.high = p.completion_cost.base * 1.2;
    if (
      p.latitude < -90 ||
      p.latitude > 90 ||
      p.longitude < -180 ||
      p.longitude > 180
    )
      errors.push(`Row ${row}: invalid coordinates.`);
    if (!(
      p.resource_estimate.p10 >= p.resource_estimate.p50 &&
      p.resource_estimate.p50 >= p.resource_estimate.p90 &&
      p.resource_estimate.p90 > 0
    ))
      errors.push(
        `Row ${row}: resource estimates must satisfy P10 >= P50 >= P90 > 0.`,
      );
    if (p.well_cost.low < 0 || p.completion_cost.low < 0)
      errors.push(`Row ${row}: costs cannot be negative.`);
    p.assumption_source =
      `CSV import. Missing values and +/-20% cost bounds use illustrative, unverified defaults. ${r.source ?? ""}`.slice(
        0,
        500,
      );
    prospects.push(p);
  });
  return { prospects: errors.length ? [] : prospects, errors };
}
export function csvTemplate() {
  download(
    "prospect-template.csv",
    csvFormat([
      {
        name: "Example prospect",
        basin: "permian_delaware",
        latitude: 31.5,
        longitude: -103.5,
        resource_p90: 700,
        resource_p50: 900,
        resource_p10: 1200,
        well_cost: 7000000,
        completion_cost: 2000000,
        source: "Replace with asset source",
      },
    ]),
    "text/csv",
  );
}
export function exportAllocation(
  input: PortfolioInput,
  allocation: Record<string, string>,
  options: Record<string, { capital: number; npv: number }>,
  meta: Record<string, string>,
) {
  const safe = (s: string) => (/^[=+\-@\t\r]/.test(s) ? `'${s}` : s);
  download(
    "allocation.csv",
    csvFormat(
      input.prospects.map((p) => ({
        prospect: safe(p.name),
        basin: p.basin,
        decision: allocation[p.prospect_id],
        capital_usd: options[p.prospect_id]?.capital ?? "",
        expected_npv_usd: options[p.prospect_id]?.npv ?? "",
        source: safe(p.assumption_source),
        ...Object.fromEntries(
          Object.entries(meta).map(([key, value]) => [key, safe(value)]),
        ),
      })),
    ),
    "text/csv",
  );
}
