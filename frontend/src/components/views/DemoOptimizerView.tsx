import type { DemoData, FrontierPoint } from "../../types/demo";
import type { DecisionType } from "../../types/portfolio";
import { formatCurrency } from "../../lib/formatters";

interface Props {
  demoData: DemoData;
  activeScenario: string;
}

const DECISION_COLORS: Record<string, string> = {
  drill: "#23D18B",
  farm_out: "#2FA7FF",
  divest: "#F97316",
  defer: "#94A3B8",
};

export function DemoOptimizerView({ demoData, activeScenario }: Props) {
  const scenarioResult = demoData.results.scenario_comparison.scenario_results.find(
    (s) => s.scenario_name === activeScenario
  );
  if (!scenarioResult) return <div className="p-6 text-slate-400">No data for scenario.</div>;

  const opt = scenarioResult.optimization_result;
  const frontier = opt.efficient_frontier;
  const recommended = opt.recommended_portfolio;

  // SVG coordinate mapping for efficient frontier
  const svgW = 700;
  const svgH = 400;
  const pad = 50;
  const risks = frontier.map((f) => f.portfolio_risk);
  const npvs = frontier.map((f) => f.expected_npv);
  const rMin = Math.min(...risks);
  const rMax = Math.max(...risks);
  const nMin = Math.min(...npvs);
  const nMax = Math.max(...npvs);

  const toSvg = (f: FrontierPoint): [number, number] => {
    const x = pad + ((f.portfolio_risk - rMin) / Math.max(rMax - rMin, 1)) * (svgW - 2 * pad);
    const y = svgH - pad - ((f.expected_npv - nMin) / Math.max(nMax - nMin, 1)) * (svgH - 2 * pad);
    return [x, y];
  };

  const pathData = frontier.map((f, i) => {
    const [x, y] = toSvg(f);
    return `${i === 0 ? "M" : "L"}${x},${y}`;
  }).join(" ");

  const [recX, recY] = toSvg(recommended);

  // Allocation breakdown
  const allocationCounts: Record<string, number> = { drill: 0, farm_out: 0, divest: 0, defer: 0 };
  Object.values(recommended.allocation).forEach((d) => {
    allocationCounts[d] = (allocationCounts[d] || 0) + 1;
  });

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {/* Efficient Frontier Chart */}
        <div className="col-span-2 bg-panel border border-slate-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Efficient Frontier — {activeScenario}</h3>
          <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" preserveAspectRatio="xMidYMid meet">
            {/* Grid */}
            {Array.from({ length: 5 }).map((_, i) => {
              const y = pad + ((svgH - 2 * pad) / 4) * i;
              const npvVal = nMax - ((nMax - nMin) / 4) * i;
              return (
                <g key={`gy-${i}`}>
                  <line x1={pad} y1={y} x2={svgW - pad} y2={y} stroke="#1a2840" strokeWidth={0.5} />
                  <text x={pad - 5} y={y + 4} textAnchor="end" className="text-[9px] fill-slate-500">
                    {formatCurrency(npvVal)}
                  </text>
                </g>
              );
            })}
            {Array.from({ length: 5 }).map((_, i) => {
              const x = pad + ((svgW - 2 * pad) / 4) * i;
              const riskVal = rMin + ((rMax - rMin) / 4) * i;
              return (
                <g key={`gx-${i}`}>
                  <line x1={x} y1={pad} x2={x} y2={svgH - pad} stroke="#1a2840" strokeWidth={0.5} />
                  <text x={x} y={svgH - pad + 15} textAnchor="middle" className="text-[9px] fill-slate-500">
                    {formatCurrency(riskVal)}
                  </text>
                </g>
              );
            })}

            {/* Axis labels */}
            <text x={svgW / 2} y={svgH - 5} textAnchor="middle" className="text-[10px] fill-slate-400">
              Portfolio Risk (Std Dev)
            </text>
            <text
              x={12}
              y={svgH / 2}
              textAnchor="middle"
              className="text-[10px] fill-slate-400"
              transform={`rotate(-90, 12, ${svgH / 2})`}
            >
              Expected NPV
            </text>

            {/* Frontier line */}
            <path d={pathData} fill="none" stroke="#2FA7FF" strokeWidth={2} opacity={0.8} />

            {/* Frontier points */}
            {frontier.map((f, i) => {
              const [x, y] = toSvg(f);
              return <circle key={i} cx={x} cy={y} r={3} fill="#2FA7FF" opacity={0.5} />;
            })}

            {/* Recommended point */}
            <circle cx={recX} cy={recY} r={8} fill="none" stroke="#23D18B" strokeWidth={2} />
            <circle cx={recX} cy={recY} r={4} fill="#23D18B" />
            <text x={recX + 12} y={recY - 5} className="text-[10px] fill-drill font-semibold">
              Recommended
            </text>
          </svg>
        </div>

        {/* Summary panel */}
        <div className="space-y-4">
          <div className="bg-panel border border-slate-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Recommended Allocation</h3>
            <div className="space-y-2">
              {Object.entries(allocationCounts).map(([dec, count]) => (
                <div key={dec} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: DECISION_COLORS[dec] }} />
                    <span className="text-slate-300 capitalize">{dec.replace("_", " ")}</span>
                  </div>
                  <span className="text-slate-400">{count} prospects</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-panel border border-slate-800 rounded-lg p-4 space-y-2">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">Portfolio Metrics</h3>
            {[
              ["Expected NPV", formatCurrency(recommended.expected_npv)],
              ["Portfolio Risk", formatCurrency(recommended.portfolio_risk)],
              ["Capital Deployed", formatCurrency(recommended.capital_deployed)],
              ["Capital Remaining", formatCurrency(recommended.capital_remaining)],
              ["Diversification Benefit", formatCurrency(opt.diversification_benefit)],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-xs">
                <span className="text-slate-500">{label}</span>
                <span className="text-slate-200">{value}</span>
              </div>
            ))}
          </div>

          {/* Per-prospect allocation */}
          <div className="bg-panel border border-slate-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">Prospect Decisions</h3>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {Object.entries(recommended.allocation).map(([id, dec]) => {
                const p = demoData.input.prospects.find((pr) => pr.prospect_id === id);
                return (
                  <div key={id} className="flex items-center justify-between text-xs py-0.5">
                    <span className="text-slate-300 truncate mr-2">{p?.name || id}</span>
                    <span className="capitalize flex-shrink-0" style={{ color: DECISION_COLORS[dec] }}>
                      {dec.replace("_", " ")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
