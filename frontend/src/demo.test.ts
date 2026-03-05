import { describe, expect, it } from "vitest";

// Import demo data fixtures
import permianInput from "./data/demos/permian/demo_input.json";
import permianResults from "./data/demos/permian/demo_results.json";
import permianScene from "./data/demos/permian/demo_3d_scene.json";
import gomInput from "./data/demos/gom/demo_input.json";
import gomResults from "./data/demos/gom/demo_results.json";
import gomScene from "./data/demos/gom/demo_3d_scene.json";

describe("Permian demo fixtures", () => {
  it("has 15 prospects", () => {
    expect(permianInput.prospects).toHaveLength(15);
  });

  it("has $150M budget", () => {
    expect(permianInput.capital_budget).toBe(150_000_000);
  });

  it("has price scenarios", () => {
    expect(permianInput.price_scenarios.length).toBe(5);
  });

  it("all prospects have valid coordinates", () => {
    for (const p of permianInput.prospects) {
      expect(p.latitude).toBeGreaterThan(25);
      expect(p.latitude).toBeLessThan(40);
      expect(p.longitude).toBeGreaterThan(-110);
      expect(p.longitude).toBeLessThan(-90);
    }
  });

  it("results cover all prospects", () => {
    const inputIds = new Set(permianInput.prospects.map((p) => p.prospect_id));
    const resultIds = new Set(permianResults.prospect_results.map((r) => r.prospect_id));
    expect(resultIds).toEqual(inputIds);
  });

  it("has scenario comparison with 5 scenarios", () => {
    expect(permianResults.scenario_comparison.scenario_results).toHaveLength(5);
  });

  it("3d scene has geological layers", () => {
    expect(permianScene.geological_layers.length).toBeGreaterThanOrEqual(2);
  });

  it("3d scene prospect count matches input", () => {
    expect(permianScene.prospect_3d).toHaveLength(15);
  });
});

describe("GOM demo fixtures", () => {
  it("has 8 prospects", () => {
    expect(gomInput.prospects).toHaveLength(8);
  });

  it("has $600M budget", () => {
    expect(gomInput.capital_budget).toBe(600_000_000);
  });

  it("results cover all prospects", () => {
    const inputIds = new Set(gomInput.prospects.map((p) => p.prospect_id));
    const resultIds = new Set(gomResults.prospect_results.map((r) => r.prospect_id));
    expect(resultIds).toEqual(inputIds);
  });

  it("3d scene is offshore type", () => {
    expect(gomScene.scene_type).toBe("offshore");
  });

  it("3d scene has tieback connections", () => {
    expect(gomScene.tieback_connections!.length).toBeGreaterThanOrEqual(3);
  });

  it("3d scene has infrastructure", () => {
    expect(gomScene.infrastructure.length).toBeGreaterThanOrEqual(3);
  });
});

describe("demo data consistency", () => {
  it("all permian simulation results have expected fields", () => {
    for (const pr of permianResults.prospect_results) {
      expect(pr.simulation).toHaveProperty("expected_npv");
      expect(pr.simulation).toHaveProperty("probability_positive_npv");
      expect(pr.simulation).toHaveProperty("capital_at_risk");
      expect(pr.simulation).toHaveProperty("npv_histogram_data");
      expect(pr.simulation.annual_cash_flows_p50).toHaveLength(30);
    }
  });

  it("all decision comparisons have 4 options", () => {
    for (const pr of permianResults.prospect_results) {
      const options = Object.keys(pr.decision_comparison.options);
      expect(options).toContain("drill");
      expect(options).toContain("farm_out");
      expect(options).toContain("divest");
      expect(options).toContain("defer");
    }
  });

  it("efficient frontiers are non-empty", () => {
    for (const sr of permianResults.scenario_comparison.scenario_results) {
      expect(sr.optimization_result.efficient_frontier.length).toBeGreaterThan(0);
    }
    for (const sr of gomResults.scenario_comparison.scenario_results) {
      expect(sr.optimization_result.efficient_frontier.length).toBeGreaterThan(0);
    }
  });
});
