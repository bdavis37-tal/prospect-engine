import type { DemoData } from "../../types/demo";
import type { DecisionType } from "../../types/portfolio";
import { formatCurrency } from "../../lib/formatters";
import { DECISION_COLORS, DECISION_LABELS } from "../../lib/constants";
import { exportPortfolioCSV, exportScenarioCSV } from "../../lib/export";

interface Props {
  demoData: DemoData;
  activeScenario: string;
}

export function DemoExecutiveSummary({ demoData, activeScenario }: Props) {
  const scenarioResult = demoData.results.scenario_comparison.scenario_results.find(
    (s) => s.scenario_name === activeScenario
  );
  if (!scenarioResult) return <div className="p-6 text-white/50">No data.</div>;

  const opt = scenarioResult.optimization_result;
  const rec = opt.recommended_portfolio;
  const comp = demoData.results.scenario_comparison;

  const allocationCounts: Record<string, number> = {};
  const allocationCapital: Record<string, number> = {};
  Object.entries(rec.allocation).forEach(([id, dec]) => {
    allocationCounts[dec] = (allocationCounts[dec] || 0) + 1;
    const pr = demoData.results.prospect_results.find((r) => r.prospect_id === id);
    if (pr && dec === "drill") {
      allocationCapital[dec] = (allocationCapital[dec] || 0) + pr.simulation.capital_at_risk;
    }
  });

  // Top prospects by NPV
  const topProspects = [...demoData.results.prospect_results]
    .sort((a, b) => b.simulation.expected_npv - a.simulation.expected_npv)
    .slice(0, 5);

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-white/90">Executive Summary</h2>
        <p className="text-sm text-white/50 mt-1">{demoData.results.scenario_name} — {activeScenario}</p>
      </div>

      {/* Key headline metrics */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Portfolio NPV", value: formatCurrency(rec.expected_npv), color: "text-drill" },
          { label: "Capital Deployed", value: formatCurrency(rec.capital_deployed), color: "text-white/80" },
          { label: "Capital Remaining", value: formatCurrency(rec.capital_remaining), color: "text-white/80" },
          { label: "Diversification Benefit", value: formatCurrency(opt.diversification_benefit), color: "text-farm" },
        ].map((m) => (
          <div key={m.label} className="bg-[#0a0e14] border border-white/[0.06] rounded-lg p-4 text-center">
            <div className="text-xs text-white/40">{m.label}</div>
            <div className={`text-lg font-bold mt-1 ${m.color}`}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Allocation breakdown */}
      <div className="bg-[#0a0e14] border border-white/[0.06] rounded-lg p-4">
        <h3 className="text-sm font-semibold text-white/70 mb-3">Recommended Allocation</h3>
        <div className="flex h-6 rounded overflow-hidden mb-3">
          {(["drill", "farm_out", "divest", "defer"] as const).map((d) => {
            const count = allocationCounts[d] || 0;
            const pct = (count / demoData.input.prospects.length) * 100;
            return (
              <div
                key={d}
                style={{ width: `${pct}%`, backgroundColor: DECISION_COLORS[d] }}
                className="flex items-center justify-center text-[9px] font-semibold"
                title={`${d}: ${count} (${pct.toFixed(0)}%)`}
              >
                {pct > 10 ? `${count}` : ""}
              </div>
            );
          })}
        </div>
        <div className="flex gap-6 text-xs text-white/50">
          {(["drill", "farm_out", "divest", "defer"] as const).map((d) => (
            <span key={d} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded" style={{ backgroundColor: DECISION_COLORS[d] }} />
              {d.replace("_", " ")}: {allocationCounts[d] || 0}
            </span>
          ))}
        </div>
      </div>

      {/* Top prospects table */}
      <div className="bg-[#0a0e14] border border-white/[0.06] rounded-lg p-4">
        <h3 className="text-sm font-semibold text-white/70 mb-3">Top 5 Prospects by Expected NPV</h3>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.08] text-white/50">
              <th className="text-left py-1.5">Prospect</th>
              <th className="text-right py-1.5">NPV</th>
              <th className="text-right py-1.5">Prob+</th>
              <th className="text-right py-1.5">Capital</th>
              <th className="text-center py-1.5">Decision</th>
            </tr>
          </thead>
          <tbody>
            {topProspects.map((pr) => {
              const p = demoData.input.prospects.find((pp) => pp.prospect_id === pr.prospect_id);
              const dec = rec.allocation[pr.prospect_id] || pr.decision_comparison.recommendation;
              return (
                <tr key={pr.prospect_id} className="border-b border-white/[0.04]">
                  <td className="py-1.5 text-white/70">{p?.name || pr.prospect_id}</td>
                  <td className="py-1.5 text-right text-drill">{formatCurrency(pr.simulation.expected_npv)}</td>
                  <td className="py-1.5 text-right text-white/70">
                    {(pr.simulation.probability_positive_npv * 100).toFixed(0)}%
                  </td>
                  <td className="py-1.5 text-right text-white/50">{formatCurrency(pr.simulation.capital_at_risk)}</td>
                  <td className="py-1.5 text-center">
                    <span className="capitalize" style={{ color: DECISION_COLORS[dec] }}>
                      {dec.replace("_", " ")}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Export actions */}
      <div className="flex justify-center gap-3">
        <button
          onClick={() => exportPortfolioCSV(demoData, activeScenario)}
          className="px-4 py-2 text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] text-white/80 rounded border border-white/[0.08] transition-colors"
        >
          Export Portfolio CSV
        </button>
        <button
          onClick={() => exportScenarioCSV(demoData)}
          className="px-4 py-2 text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] text-white/80 rounded border border-white/[0.08] transition-colors"
        >
          Export Scenario CSV
        </button>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] text-white/80 rounded border border-white/[0.08] transition-colors"
        >
          Print Summary
        </button>
      </div>

      {/* Robustness summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#0a0e14] border border-white/[0.06] rounded-lg p-4">
          <h3 className="text-sm font-semibold text-white/70 mb-2">Scenario Robustness</h3>
          <div className="text-xs space-y-1.5 text-white/50">
            <div>
              <span className="text-drill">{comp.robust_prospects.length}</span> prospects have consistent
              decisions across all {comp.scenario_results.length} price scenarios.
            </div>
            <div>
              <span className="text-divest">{comp.fragile_prospects.length}</span> prospects are scenario-sensitive
              — their optimal decision changes with commodity prices.
            </div>
          </div>
        </div>

        <div className="bg-[#0a0e14] border border-white/[0.06] rounded-lg p-4">
          <h3 className="text-sm font-semibold text-white/70 mb-2">Key Constraints</h3>
          <div className="text-xs space-y-1.5 text-white/50">
            <div>Budget: <span className="text-white/80">{formatCurrency(demoData.input.capital_budget)}</span></div>
            {demoData.input.constraints.mandatory_drill && (
              <div>
                Mandatory drill:{" "}
                <span className="text-white/80">
                  {demoData.input.constraints.mandatory_drill
                    .map((id) => demoData.input.prospects.find((p) => p.prospect_id === id)?.name || id)
                    .join(", ")}
                </span>
              </div>
            )}
            {demoData.input.constraints.max_single_prospect_pct_of_budget && (
              <div>
                Max single prospect:{" "}
                <span className="text-white/80">
                  {(demoData.input.constraints.max_single_prospect_pct_of_budget * 100).toFixed(0)}% of budget
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
