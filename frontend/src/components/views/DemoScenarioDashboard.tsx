import type { DemoData } from "../../types/demo";
import type { DecisionType } from "../../types/portfolio";
import { formatCurrency } from "../../lib/formatters";
import { DECISION_COLORS, DECISION_LABELS } from "../../lib/constants";

interface Props {
  demoData: DemoData;
}

export function DemoScenarioDashboard({ demoData }: Props) {
  const comp = demoData.results.scenario_comparison;
  const scenarios = comp.scenario_results;

  // Build robustness matrix: prospect x scenario -> decision
  const matrix: Record<string, Record<string, DecisionType>> = {};
  for (const prospect of demoData.input.prospects) {
    matrix[prospect.prospect_id] = {};
    for (const sr of scenarios) {
      const dec = sr.optimization_result.recommended_portfolio.allocation[prospect.prospect_id];
      matrix[prospect.prospect_id][sr.scenario_name] = (dec || "defer") as DecisionType;
    }
  }

  return (
    <div className="p-4 space-y-4">
      {/* Scenario comparison cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {scenarios.map((sr) => {
          const rec = sr.optimization_result.recommended_portfolio;
          return (
            <div key={sr.scenario_name} className="bg-[#0a0e14] border border-white/[0.06] rounded-lg p-3">
              <h3 className="text-xs font-semibold text-white/70 truncate">{sr.scenario_name}</h3>
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-white/40">NPV</span>
                  <span className="text-drill font-semibold">{formatCurrency(rec.expected_npv)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Risk</span>
                  <span className="text-white/70">{formatCurrency(rec.portfolio_risk)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Deployed</span>
                  <span className="text-white/70">{formatCurrency(rec.capital_deployed)}</span>
                </div>
              </div>
              {/* Mini allocation bar */}
              <div className="flex h-2 rounded mt-2 overflow-hidden">
                {(["drill", "farm_out", "divest", "defer"] as const).map((d) => {
                  const count = Object.values(rec.allocation).filter((v) => v === d).length;
                  const pct = (count / Math.max(Object.keys(rec.allocation).length, 1)) * 100;
                  return (
                    <div
                      key={d}
                      style={{ width: `${pct}%`, backgroundColor: DECISION_COLORS[d] }}
                      title={`${d}: ${count}`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Robustness classification */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#0a0e14] border border-white/[0.06] rounded-lg p-4">
          <h3 className="text-sm font-semibold text-drill mb-2">
            Robust Prospects ({comp.robust_prospects.length})
          </h3>
          <p className="text-[10px] text-white/40 mb-2">Same decision across all scenarios</p>
          <div className="space-y-1">
            {comp.robust_prospects.map((id) => {
              const p = demoData.input.prospects.find((pr) => pr.prospect_id === id);
              const dec = matrix[id]?.[scenarios[0]?.scenario_name] || "defer";
              return (
                <div key={id} className="flex items-center justify-between text-xs">
                  <span className="text-white/70">{p?.name || id}</span>
                  <span className="capitalize" style={{ color: DECISION_COLORS[dec] }}>
                    {dec.replace("_", " ")}
                  </span>
                </div>
              );
            })}
            {comp.robust_prospects.length === 0 && (
              <p className="text-xs text-white/40 italic">No fully robust prospects</p>
            )}
          </div>
        </div>

        <div className="bg-[#0a0e14] border border-white/[0.06] rounded-lg p-4">
          <h3 className="text-sm font-semibold text-divest mb-2">
            Fragile Prospects ({comp.fragile_prospects.length})
          </h3>
          <p className="text-[10px] text-white/40 mb-2">Decision changes across scenarios</p>
          <div className="space-y-1">
            {comp.fragile_prospects.map((id) => {
              const p = demoData.input.prospects.find((pr) => pr.prospect_id === id);
              const decisions = Object.values(matrix[id] || {});
              const unique = [...new Set(decisions)];
              return (
                <div key={id} className="flex items-center justify-between text-xs">
                  <span className="text-white/70">{p?.name || id}</span>
                  <div className="flex gap-1">
                    {unique.map((d) => (
                      <span key={d} className="capitalize text-[10px] px-1 rounded" style={{ color: DECISION_COLORS[d] }}>
                        {d.replace("_", " ")}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
            {comp.fragile_prospects.length === 0 && (
              <p className="text-xs text-white/40 italic">No fragile prospects</p>
            )}
          </div>
        </div>
      </div>

      {/* Full decision matrix */}
      <div className="bg-[#0a0e14] border border-white/[0.06] rounded-lg p-4 overflow-x-auto">
        <h3 className="text-sm font-semibold text-white/70 mb-3">Decision Matrix — All Scenarios</h3>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.08]">
              <th className="text-left py-1.5 pr-3 text-white/50 font-medium">Prospect</th>
              {scenarios.map((sr) => (
                <th key={sr.scenario_name} className="text-center py-1.5 px-2 text-white/50 font-medium">
                  {sr.scenario_name.replace(" Case", "")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {demoData.input.prospects.map((p) => {
              const isFragile = comp.fragile_prospects.includes(p.prospect_id);
              return (
                <tr key={p.prospect_id} className={`border-b border-white/[0.04] ${isFragile ? "bg-[#F97316]/[0.03]" : ""}`}>
                  <td className="py-1.5 pr-3 text-white/70">{p.name}</td>
                  {scenarios.map((sr) => {
                    const dec = matrix[p.prospect_id]?.[sr.scenario_name] || "defer";
                    return (
                      <td key={sr.scenario_name} className="text-center py-1.5 px-2">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: DECISION_COLORS[dec] }}
                          title={dec}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Legend */}
        <div className="flex gap-4 mt-2 text-[10px] text-white/40">
          {Object.entries(DECISION_COLORS).map(([key, color]) => (
            <span key={key} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              {key.replace("_", " ")}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
