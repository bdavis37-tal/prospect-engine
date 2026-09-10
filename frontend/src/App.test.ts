import { describe, expect, it } from "vitest";
import permian from "./data/demos/permian/analysis.json";
import gom from "./data/demos/gom/analysis.json";
for (const sample of [permian, gom]) describe(sample.input.name, () => {
  it("provides every scenario with a complete immutable input and feasible recommendation", () => {
    expect(sample.model_version).toBe("2.0.0");
    expect(sample.input_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(sample.scenario_comparison.scenario_results.length).toBe(sample.input.price_scenarios.length);
    for (const scenario of sample.scenario_comparison.scenario_results) {
      const point = scenario.optimization_result.recommended_portfolio;
      expect(Object.keys(point.allocation).sort()).toEqual(sample.input.prospects.map(p => p.prospect_id).sort());
      expect(point.capital_deployed).toBeLessThanOrEqual(sample.input.capital_budget + 1);
      expect(scenario.prospect_results.length).toBe(sample.input.prospects.length);
    }
  });
});
