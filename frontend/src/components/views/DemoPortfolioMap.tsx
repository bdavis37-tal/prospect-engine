import type { DemoData } from "../../types/demo";
import type { DecisionType } from "../../types/portfolio";
import { formatCurrency } from "../../lib/formatters";
import { DECISION_COLORS, DECISION_ICONS, DECISION_LABELS } from "../../lib/constants";

interface Props {
  demoData: DemoData;
  activeScenario: string;
  onSelectProspect?: (id: string) => void;
}

export function DemoPortfolioMap({ demoData, activeScenario, onSelectProspect }: Props) {
  const scenarioResult = demoData.results.scenario_comparison.scenario_results.find(
    (s) => s.scenario_name === activeScenario
  );

  const decisions: Record<string, DecisionType> = {};
  if (scenarioResult) {
    for (const [id, dec] of Object.entries(scenarioResult.optimization_result.recommended_portfolio.allocation)) {
      decisions[id] = dec as DecisionType;
    }
  }
  for (const p of demoData.input.prospects) {
    if (!decisions[p.prospect_id]) {
      const pr = demoData.results.prospect_results.find((r) => r.prospect_id === p.prospect_id);
      decisions[p.prospect_id] = (pr?.decision_comparison.recommendation || "defer") as DecisionType;
    }
  }

  // Compute SVG-based map bounds
  const lats = demoData.input.prospects.map((p) => p.latitude);
  const lons = demoData.input.prospects.map((p) => p.longitude);
  const padding = 0.15;
  const latMin = Math.min(...lats) - padding;
  const latMax = Math.max(...lats) + padding;
  const lonMin = Math.min(...lons) - padding;
  const lonMax = Math.max(...lons) + padding;

  const toSvg = (lat: number, lon: number): [number, number] => {
    const x = ((lon - lonMin) / (lonMax - lonMin)) * 800;
    const y = ((latMax - lat) / (latMax - latMin)) * 500;
    return [x, y];
  };

  return (
    <div className="h-full p-4">
      <div className="w-full h-full rounded-xl border border-white/[0.06] bg-[#0a0e14] relative overflow-hidden">
        <svg viewBox="0 0 800 500" className="w-full h-full" preserveAspectRatio="xMidYMid meet" role="img" aria-label={`Portfolio map showing ${demoData.input.prospects.length} prospects with decision allocations`}>
          {/* Grid */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="800" height="500" fill="url(#grid)" />

          {/* Infrastructure connections from 3D scene */}
          {demoData.scene3d.infrastructure.map((infra, i) => {
            const [ix, iy] = toSvg(infra.latitude, infra.longitude);
            return (
              <g key={`infra-${i}`}>
                <rect x={ix - 6} y={iy - 6} width={12} height={12} rx={2} fill="#444" stroke="#666" strokeWidth={1} />
                <text x={ix} y={iy - 10} textAnchor="middle" className="text-[8px] fill-white/40">
                  {infra.name}
                </text>
              </g>
            );
          })}

          {/* Tiebacks */}
          {(demoData.scene3d.tieback_connections || []).map((tb, i) => {
            const prospect = demoData.input.prospects.find((p) => p.prospect_id === tb.from_prospect);
            const infra = demoData.scene3d.infrastructure.find((inf) => inf.name === tb.to_infrastructure);
            if (!prospect || !infra) return null;
            const [x1, y1] = toSvg(prospect.latitude, prospect.longitude);
            const [x2, y2] = toSvg(infra.latitude, infra.longitude);
            return (
              <line
                key={`tb-${i}`}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="#4fc3f7" strokeWidth={1} strokeDasharray="4,3" opacity={0.5}
              />
            );
          })}

          {/* Prospect pins with decision letter icons for accessibility */}
          {demoData.input.prospects.map((prospect) => {
            const [cx, cy] = toSvg(prospect.latitude, prospect.longitude);
            const decision = decisions[prospect.prospect_id] || "defer";
            const color = DECISION_COLORS[decision];
            const icon = DECISION_ICONS[decision];
            const pr = demoData.results.prospect_results.find((r) => r.prospect_id === prospect.prospect_id);
            const size = Math.max(6, Math.min(14, (prospect.resource_estimate.p50 / 200) * 3));

            return (
              <g
                key={prospect.prospect_id}
                onClick={() => onSelectProspect?.(prospect.prospect_id)}
                className="cursor-pointer"
                role="button"
                aria-label={`${prospect.name}: ${DECISION_LABELS[decision]}, NPV ${pr ? formatCurrency(pr.simulation.expected_npv) : "N/A"}`}
              >
                <title>{`${prospect.name}\n${DECISION_LABELS[decision]}${pr ? `\nNPV: ${formatCurrency(pr.simulation.expected_npv)}` : ""}${pr ? `\nP(+NPV): ${(pr.simulation.probability_positive_npv * 100).toFixed(0)}%` : ""}`}</title>
                <circle cx={cx} cy={cy} r={size + 4} fill={color} opacity={0.15} />
                <circle cx={cx} cy={cy} r={size} fill={color} opacity={0.85} stroke="#000" strokeWidth={0.5} />
                {/* Decision letter icon inside pin for colorblind accessibility */}
                <text
                  x={cx}
                  y={cy + 1}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="font-bold select-none pointer-events-none"
                  fill="#000"
                  fontSize={size * 0.9}
                >
                  {icon}
                </text>
                {prospect.lease_expiry_years && prospect.lease_expiry_years <= 1.5 && (
                  <text x={cx + size + 2} y={cy - size} className="text-[8px] fill-red-400 font-bold">!</text>
                )}
                <text x={cx} y={cy + size + 12} textAnchor="middle" className="text-[9px] fill-white/70 font-medium">
                  {prospect.name}
                </text>
                {pr && (
                  <text x={cx} y={cy + size + 22} textAnchor="middle" className="text-[8px] fill-white/40">
                    {formatCurrency(pr.simulation.expected_npv)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Legend with icons */}
        <div className="absolute bottom-3 left-3 bg-[#0a0e14]/90 border border-white/[0.08] rounded-lg px-4 py-2.5 flex gap-4 text-xs text-white/50 backdrop-blur-sm">
          {(Object.entries(DECISION_COLORS) as [DecisionType, string][]).map(([key, color]) => (
            <span key={key} className="flex items-center gap-1.5">
              <span
                className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-black"
                style={{ backgroundColor: color }}
              >
                {DECISION_ICONS[key]}
              </span>
              {DECISION_LABELS[key]}
            </span>
          ))}
        </div>

        {/* Basin label */}
        <div className="absolute top-3 left-3 text-xs text-white/40 bg-[#0a0e14]/80 backdrop-blur-sm rounded-md px-3 py-1.5 border border-white/[0.06]">
          {demoData.scene3d.scene_type === "offshore" ? "Gulf of Mexico" : "Permian Basin"} — {activeScenario}
        </div>
      </div>
    </div>
  );
}
