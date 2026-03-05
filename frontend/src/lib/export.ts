import type { DemoData } from "../types/demo";
import type { DecisionType } from "../types/portfolio";
import { formatCurrency } from "./formatters";
import { DECISION_LABELS } from "./constants";

/**
 * Export executive summary as a printable PDF via the browser print dialog.
 * Uses @media print CSS to create a clean layout.
 */
export function exportExecutiveSummary(): void {
  window.print();
}

/**
 * Export portfolio data as a CSV file (Excel-compatible).
 */
export function exportPortfolioCSV(demoData: DemoData, scenarioName: string): void {
  const scenarioResult = demoData.results.scenario_comparison.scenario_results.find(
    (s) => s.scenario_name === scenarioName
  );
  const allocation = scenarioResult?.optimization_result.recommended_portfolio.allocation ?? {};

  const headers = [
    "Prospect ID",
    "Name",
    "Basin",
    "Hydrocarbon Type",
    "Decision",
    "Expected NPV ($)",
    "Capital at Risk ($)",
    "Probability Positive (%)",
    "Expected IRR (%)",
    "P10 NPV ($)",
    "P50 NPV ($)",
    "P90 NPV ($)",
    "Risk/Reward Ratio",
  ];

  const rows = demoData.results.prospect_results.map((pr) => {
    const prospect = demoData.input.prospects.find((p) => p.prospect_id === pr.prospect_id);
    const decision = (allocation[pr.prospect_id] || pr.decision_comparison.recommendation) as DecisionType;
    const sim = pr.simulation;
    return [
      pr.prospect_id,
      prospect?.name ?? pr.prospect_id,
      prospect?.basin ?? "",
      prospect?.hydrocarbon_type ?? "",
      DECISION_LABELS[decision],
      Math.round(sim.expected_npv),
      Math.round(sim.capital_at_risk),
      (sim.probability_positive_npv * 100).toFixed(1),
      (sim.expected_irr * 100).toFixed(1),
      Math.round(sim.npv_distribution.p10),
      Math.round(sim.npv_distribution.p50),
      Math.round(sim.npv_distribution.p90),
      sim.risk_reward_ratio.toFixed(3),
    ];
  });

  const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `prospect-engine-${demoData.results.scenario_name.replace(/\s+/g, "-").toLowerCase()}-${scenarioName.replace(/\s+/g, "-").toLowerCase()}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * Export scenario comparison data as CSV.
 */
export function exportScenarioCSV(demoData: DemoData): void {
  const scenarios = demoData.results.scenario_comparison.scenario_results;
  const headers = [
    "Scenario",
    "Portfolio NPV ($)",
    "Portfolio Risk ($)",
    "Capital Deployed ($)",
    "Capital Remaining ($)",
    "Drills",
    "Farm-outs",
    "Divests",
    "Defers",
  ];

  const rows = scenarios.map((sr) => {
    const rec = sr.optimization_result.recommended_portfolio;
    const alloc = Object.values(rec.allocation);
    return [
      sr.scenario_name,
      Math.round(rec.expected_npv),
      Math.round(rec.portfolio_risk),
      Math.round(rec.capital_deployed),
      Math.round(rec.capital_remaining),
      alloc.filter((d) => d === "drill").length,
      alloc.filter((d) => d === "farm_out").length,
      alloc.filter((d) => d === "divest").length,
      alloc.filter((d) => d === "defer").length,
    ];
  });

  const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `prospect-engine-scenarios-${demoData.results.scenario_name.replace(/\s+/g, "-").toLowerCase()}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}
