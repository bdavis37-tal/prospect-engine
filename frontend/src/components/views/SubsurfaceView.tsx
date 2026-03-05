import { useState } from "react";
import { SubsurfaceScene } from "../three/SubsurfaceScene";
import type { DemoData } from "../../types/demo";
import type { DecisionType } from "../../types/portfolio";
import { formatCurrency } from "../../lib/formatters";
import { DECISION_COLORS } from "../../lib/constants";

interface SubsurfaceViewProps {
  demoData: DemoData;
  activeScenario: string;
  onSelectProspect?: (id: string) => void;
}

export function SubsurfaceView({ demoData, activeScenario, onSelectProspect }: SubsurfaceViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Get decisions for the active scenario
  const scenarioResult = demoData.results.scenario_comparison.scenario_results.find(
    (s) => s.scenario_name === activeScenario
  );
  const decisions: Record<string, DecisionType> = {};
  if (scenarioResult) {
    const alloc = scenarioResult.optimization_result.recommended_portfolio.allocation;
    for (const [id, dec] of Object.entries(alloc)) {
      decisions[id] = dec as DecisionType;
    }
  }
  // Fill in defaults for any missing
  for (const p of demoData.input.prospects) {
    if (!decisions[p.prospect_id]) {
      const pr = demoData.results.prospect_results.find((r) => r.prospect_id === p.prospect_id);
      decisions[p.prospect_id] = (pr?.decision_comparison.recommendation || "defer") as DecisionType;
    }
  }

  const handleSelect = (id: string) => {
    setSelectedId(id);
    onSelectProspect?.(id);
  };

  const selectedProspect = selectedId
    ? demoData.input.prospects.find((p) => p.prospect_id === selectedId)
    : null;
  const selectedResult = selectedId
    ? demoData.results.prospect_results.find((r) => r.prospect_id === selectedId)
    : null;

  return (
    <div className="flex h-[calc(100vh-10rem)]">
      {/* Sidebar */}
      <div
        className={`transition-all duration-200 ${sidebarOpen ? "w-72" : "w-0"} overflow-hidden border-r border-slate-800 bg-panel/50 flex-shrink-0`}
      >
        <div className="p-3 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-300">Prospects</h3>
          <button onClick={() => setSidebarOpen(false)} className="text-slate-500 hover:text-slate-300 text-xs">
            Hide
          </button>
        </div>
        <div className="overflow-y-auto h-full">
          {demoData.input.prospects.map((p) => {
            const dec = decisions[p.prospect_id];
            const pr = demoData.results.prospect_results.find((r) => r.prospect_id === p.prospect_id);
            return (
              <button
                key={p.prospect_id}
                onClick={() => handleSelect(p.prospect_id)}
                className={`w-full text-left px-3 py-2 border-b border-slate-800/50 hover:bg-slate-800/50 ${
                  selectedId === p.prospect_id ? "bg-slate-800/80" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: DECISION_COLORS[dec] }} />
                  <span className="text-xs font-medium text-slate-200 truncate">{p.name}</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 ml-4">
                  {pr ? formatCurrency(pr.simulation.expected_npv) : "—"} NPV ·{" "}
                  {pr ? `${(pr.simulation.probability_positive_npv * 100).toFixed(0)}%` : "—"} prob+
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main 3D scene */}
      <div className="flex-1 relative">
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute top-3 left-3 z-10 px-2 py-1 text-xs rounded bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700/50"
          >
            Prospects
          </button>
        )}

        <SubsurfaceScene
          prospects={demoData.input.prospects}
          scene3d={demoData.scene3d}
          decisions={decisions}
          selectedProspectId={selectedId}
          onSelectProspect={handleSelect}
        />

        {/* Selected prospect detail overlay */}
        {selectedProspect && selectedResult && (
          <div className="absolute top-3 right-64 bg-panel/95 border border-slate-700 rounded-lg p-4 text-sm w-64">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-slate-100">{selectedProspect.name}</h4>
              <button onClick={() => setSelectedId(null)} className="text-slate-500 hover:text-slate-300 text-xs">
                ✕
              </button>
            </div>
            <div className="mt-2 space-y-1 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>Expected NPV</span>
                <span className="text-slate-200">{formatCurrency(selectedResult.simulation.expected_npv)}</span>
              </div>
              <div className="flex justify-between">
                <span>Capital at Risk</span>
                <span className="text-slate-200">{formatCurrency(selectedResult.simulation.capital_at_risk)}</span>
              </div>
              <div className="flex justify-between">
                <span>Prob. Positive</span>
                <span className="text-slate-200">
                  {(selectedResult.simulation.probability_positive_npv * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Decision</span>
                <span className="capitalize" style={{ color: DECISION_COLORS[decisions[selectedProspect.prospect_id]] }}>
                  {decisions[selectedProspect.prospect_id].replace("_", " ")}
                </span>
              </div>
              {selectedProspect.water_depth_ft && (
                <div className="flex justify-between">
                  <span>Water Depth</span>
                  <span className="text-slate-200">{selectedProspect.water_depth_ft.toLocaleString()} ft</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>P50 EUR</span>
                <span className="text-slate-200">
                  {selectedProspect.resource_estimate.p50.toLocaleString()} {selectedProspect.resource_estimate.unit}
                </span>
              </div>
            </div>
            {selectedProspect.notes && (
              <p className="text-[10px] text-slate-500 mt-2 italic">{selectedProspect.notes}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
