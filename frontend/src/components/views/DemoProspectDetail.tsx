import { SubsurfaceScene } from "../three/SubsurfaceScene";
import type { DemoData, ProspectResult } from "../../types/demo";
import type { DecisionType } from "../../types/portfolio";
import { formatCurrency } from "../../lib/formatters";

interface Props {
  demoData: DemoData;
  activeScenario: string;
  selectedProspectId: string | null;
  onSelectProspect: (id: string | null) => void;
}

const DECISION_COLORS: Record<string, string> = {
  drill: "#23D18B",
  farm_out: "#2FA7FF",
  divest: "#F97316",
  defer: "#94A3B8",
};

function NPVHistogram({ data }: { data: ProspectResult["simulation"]["npv_histogram_data"] }) {
  const maxFreq = Math.max(...data.map((b) => b.frequency), 1);
  return (
    <div className="flex items-end gap-px h-24">
      {data.map((bin, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-sm"
          style={{
            height: `${(bin.frequency / maxFreq) * 100}%`,
            backgroundColor: bin.bin_start >= 0 ? "#23D18B" : "#F97316",
            opacity: 0.7,
          }}
          title={`${formatCurrency(bin.bin_start)} — ${formatCurrency(bin.bin_end)}: ${bin.frequency}`}
        />
      ))}
    </div>
  );
}

function CashFlowChart({ p10, p50, p90 }: { p10: number[]; p50: number[]; p90: number[] }) {
  const all = [...p10, ...p50, ...p90];
  const max = Math.max(...all, 1);
  const min = Math.min(...all, 0);
  const range = max - min || 1;
  const h = 80;
  const w = Math.max(p50.length * 8, 200);

  const toY = (v: number) => h - ((v - min) / range) * h;
  const toPath = (arr: number[]) =>
    arr.map((v, i) => `${i === 0 ? "M" : "L"}${(i / (arr.length - 1)) * w},${toY(v)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-20" preserveAspectRatio="none">
      <line x1={0} y1={toY(0)} x2={w} y2={toY(0)} stroke="#334155" strokeWidth={0.5} />
      <path d={toPath(p10)} fill="none" stroke="#23D18B" strokeWidth={1} opacity={0.4} />
      <path d={toPath(p50)} fill="none" stroke="#23D18B" strokeWidth={1.5} />
      <path d={toPath(p90)} fill="none" stroke="#F97316" strokeWidth={1} opacity={0.4} />
    </svg>
  );
}

function TornadoMini({ tornado }: { tornado: ProspectResult["tornado"] }) {
  const maxSwing = Math.max(...tornado.sensitivities.map((s) => s.swing), 1);
  return (
    <div className="space-y-1">
      {tornado.sensitivities.slice(0, 5).map((s) => (
        <div key={s.variable_name} className="flex items-center gap-2 text-[10px]">
          <span className="w-16 text-right text-slate-400 truncate">{s.variable_name}</span>
          <div className="flex-1 h-3 bg-slate-800 rounded relative">
            <div
              className="absolute h-full bg-farm/50 rounded"
              style={{ width: `${(s.swing / maxSwing) * 100}%` }}
            />
          </div>
          <span className="w-14 text-slate-500">{formatCurrency(s.swing)}</span>
        </div>
      ))}
    </div>
  );
}

export function DemoProspectDetail({ demoData, activeScenario, selectedProspectId, onSelectProspect }: Props) {
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

  const prospect = selectedProspectId
    ? demoData.input.prospects.find((p) => p.prospect_id === selectedProspectId)
    : demoData.input.prospects[0];
  const prospectResult = prospect
    ? demoData.results.prospect_results.find((r) => r.prospect_id === prospect.prospect_id)
    : null;

  if (!prospect || !prospectResult) {
    return <div className="p-6 text-slate-400">Select a prospect to view details.</div>;
  }

  const sim = prospectResult.simulation;
  const dec = prospectResult.decision_comparison;
  const decision = decisions[prospect.prospect_id] || dec.recommendation;

  // Find nearby prospects for the mini 3D view
  const nearbyIds = demoData.input.prospects
    .filter((p) => {
      if (p.prospect_id === prospect.prospect_id) return true;
      const dist = Math.sqrt(
        (p.latitude - prospect.latitude) ** 2 + (p.longitude - prospect.longitude) ** 2
      );
      return dist < 0.5;
    })
    .map((p) => p.prospect_id);

  return (
    <div className="flex h-[calc(100vh-10rem)]">
      {/* Prospect list sidebar */}
      <div className="w-56 border-r border-slate-800 overflow-y-auto flex-shrink-0">
        {demoData.input.prospects.map((p) => (
          <button
            key={p.prospect_id}
            onClick={() => onSelectProspect(p.prospect_id)}
            className={`w-full text-left px-3 py-2 border-b border-slate-800/50 hover:bg-slate-800/50 text-xs ${
              p.prospect_id === prospect.prospect_id ? "bg-slate-800/80" : ""
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: DECISION_COLORS[decisions[p.prospect_id] || "defer"] }}
              />
              <span className="text-slate-200 truncate">{p.name}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Detail content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">{prospect.name}</h2>
            <p className="text-xs text-slate-400">
              {prospect.basin.replace(/_/g, " ")} · {prospect.hydrocarbon_type}
              {prospect.water_depth_ft ? ` · ${prospect.water_depth_ft.toLocaleString()} ft water depth` : ""}
            </p>
          </div>
          <div
            className="px-3 py-1 rounded text-sm font-medium capitalize"
            style={{ backgroundColor: DECISION_COLORS[decision] + "20", color: DECISION_COLORS[decision] }}
          >
            {decision.replace("_", " ")}
          </div>
        </div>

        {prospect.notes && <p className="text-xs text-slate-500 italic">{prospect.notes}</p>}

        {prospect.lease_expiry_years && prospect.lease_expiry_years <= 1.5 && (
          <div className="text-xs text-red-400 bg-red-900/20 border border-red-800/30 rounded px-3 py-1.5">
            Lease expires in {(prospect.lease_expiry_years * 12).toFixed(0)} months — mandatory drill constraint
          </div>
        )}

        {/* Key metrics grid */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Expected NPV", value: formatCurrency(sim.expected_npv) },
            { label: "Capital at Risk", value: formatCurrency(sim.capital_at_risk) },
            { label: "Prob. Positive", value: `${(sim.probability_positive_npv * 100).toFixed(1)}%` },
            { label: "Expected IRR", value: `${(sim.expected_irr * 100).toFixed(1)}%` },
            { label: "P10 NPV", value: formatCurrency(sim.npv_distribution.p10) },
            { label: "P50 NPV", value: formatCurrency(sim.npv_distribution.p50) },
            { label: "P90 NPV", value: formatCurrency(sim.npv_distribution.p90) },
            { label: "Risk/Reward", value: sim.risk_reward_ratio.toFixed(2) },
          ].map((m) => (
            <div key={m.label} className="bg-panel border border-slate-800 rounded-lg p-2.5">
              <div className="text-[10px] text-slate-500">{m.label}</div>
              <div className="text-sm font-semibold text-slate-200 mt-0.5">{m.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* NPV Distribution */}
          <div className="bg-panel border border-slate-800 rounded-lg p-3">
            <h3 className="text-xs font-semibold text-slate-300 mb-2">NPV Distribution</h3>
            <NPVHistogram data={sim.npv_histogram_data} />
            <div className="flex justify-between text-[9px] text-slate-500 mt-1">
              <span>{formatCurrency(sim.npv_distribution.min)}</span>
              <span>{formatCurrency(sim.npv_distribution.max)}</span>
            </div>
          </div>

          {/* Cash Flow Projections */}
          <div className="bg-panel border border-slate-800 rounded-lg p-3">
            <h3 className="text-xs font-semibold text-slate-300 mb-2">Annual Cash Flows (P10/P50/P90)</h3>
            <CashFlowChart p10={sim.annual_cash_flows_p10} p50={sim.annual_cash_flows_p50} p90={sim.annual_cash_flows_p90} />
            <div className="flex justify-between text-[9px] text-slate-500 mt-1">
              <span>Year 1</span>
              <span>Year {sim.annual_cash_flows_p50.length}</span>
            </div>
          </div>

          {/* Decision Comparison */}
          <div className="bg-panel border border-slate-800 rounded-lg p-3">
            <h3 className="text-xs font-semibold text-slate-300 mb-2">Decision Options</h3>
            <div className="space-y-1.5">
              {Object.entries(dec.options).map(([key, metrics]) => (
                <div
                  key={key}
                  className={`flex items-center justify-between text-xs px-2 py-1 rounded ${
                    key === dec.recommendation ? "bg-slate-800/60" : ""
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: DECISION_COLORS[key] }} />
                    <span className="capitalize text-slate-300">{key.replace("_", " ")}</span>
                    {key === dec.recommendation && (
                      <span className="text-[9px] text-drill">recommended</span>
                    )}
                  </div>
                  <span className="text-slate-400">{formatCurrency(metrics.expected_npv)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sensitivity */}
          <div className="bg-panel border border-slate-800 rounded-lg p-3">
            <h3 className="text-xs font-semibold text-slate-300 mb-2">Sensitivity (Tornado)</h3>
            <TornadoMini tornado={prospectResult.tornado} />
          </div>
        </div>

        {/* 3D mini panel */}
        <div className="bg-panel border border-slate-800 rounded-lg p-3">
          <h3 className="text-xs font-semibold text-slate-300 mb-2">Subsurface Context</h3>
          <SubsurfaceScene
            prospects={demoData.input.prospects}
            scene3d={demoData.scene3d}
            decisions={decisions}
            selectedProspectId={prospect.prospect_id}
            compact
            filterProspectIds={nearbyIds}
          />
        </div>

        {/* Resource & cost table */}
        <div className="bg-panel border border-slate-800 rounded-lg p-3">
          <h3 className="text-xs font-semibold text-slate-300 mb-2">Prospect Parameters</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
            {[
              ["P90 EUR", `${prospect.resource_estimate.p90.toLocaleString()} ${prospect.resource_estimate.unit}`],
              ["P50 EUR", `${prospect.resource_estimate.p50.toLocaleString()} ${prospect.resource_estimate.unit}`],
              ["P10 EUR", `${prospect.resource_estimate.p10.toLocaleString()} ${prospect.resource_estimate.unit}`],
              ["Well Cost", formatCurrency(prospect.well_cost.base)],
              ["Completion", formatCurrency(prospect.completion_cost.base)],
              ["Facility", formatCurrency(prospect.facility_cost)],
              ["Opex/BOE", `$${prospect.opex_per_boe.base.toFixed(1)}`],
              ["Royalty", `${(prospect.royalty_rate * 100).toFixed(1)}%`],
              ["IP Rate", `${prospect.decline_params.initial_production_rate.toLocaleString()} BOE/d`],
              ["Initial Decline", `${(prospect.decline_params.initial_decline_rate * 100).toFixed(0)}%`],
              ["b-factor", prospect.decline_params.b_factor.toFixed(2)],
              ["WI", `${(prospect.working_interest * 100).toFixed(0)}%`],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between py-0.5 border-b border-slate-800/30">
                <span className="text-slate-500">{label}</span>
                <span className="text-slate-300">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
