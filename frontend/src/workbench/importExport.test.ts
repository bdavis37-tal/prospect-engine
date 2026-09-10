import { describe, it, expect } from "vitest";
import { importProspects } from "./importExport";
import { newPortfolio, newProspect } from "./defaults";

describe("draft and import guarantees", () => {
  it("rejects malformed imported rows without partially replacing the portfolio", () => {
    const result = importProspects(
      "name,basin,latitude\nGood,permian_delaware,31\nBad,permian_delaware,100",
    );
    expect(result.prospects).toEqual([]);
    expect(result.errors.join()).toContain("Row 3");
  });
  it("identifies missing values as illustrative defaults", () => {
    const result = importProspects("name,basin\nAsset,bakken");
    expect(result.errors).toEqual([]);
    expect(result.prospects[0].assumption_source).toContain("unverified");
  });
  it("does not accept unknown basins or inverted resource estimates", () => {
    expect(importProspects("name,basin\nAsset,invalid").errors.length).toBe(1);
    expect(
      importProspects(
        "name,basin,resource_p90,resource_p10\nAsset,bakken,9999,10",
      ).errors.length,
    ).toBe(1);
  });
  it("creates complete independent prospect drafts and bounded defaults", () => {
    const a = newPortfolio(),
      b = newPortfolio();
    a.prospects[0].name = "Changed";
    expect(b.prospects[0].name).toBe("New prospect");
    expect(a.prospects[0].prospect_id).not.toBe(b.prospects[0].prospect_id);
    expect(newProspect("haynesville").resource_estimate.unit).toBe("BCF");
    expect(a.price_scenarios[0].oil_price_deck.length).toBe(
      a.prospects[0].decline_params.well_life_years,
    );
  });
});
