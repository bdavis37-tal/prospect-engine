import { useState } from "react";
import type { DemoData } from "../../types/demo";
import type { DecisionType } from "../../types/portfolio";
import { DemoBanner } from "./DemoBanner";
import { SubsurfaceView } from "../views/SubsurfaceView";
import { DemoPortfolioMap } from "../views/DemoPortfolioMap";
import { DemoProspectDetail } from "../views/DemoProspectDetail";
import { DemoOptimizerView } from "../views/DemoOptimizerView";
import { DemoScenarioDashboard } from "../views/DemoScenarioDashboard";
import { DemoExecutiveSummary } from "../views/DemoExecutiveSummary";
import { formatCurrency } from "../../lib/formatters";

type ViewTab = "map" | "3d" | "detail" | "optimizer" | "scenarios" | "summary";

interface DemoExplorerProps {
  demoData: DemoData;
  scenarioName: string;
  onStartOwn: () => void;
  onSwitchDemo: () => void;
}

const TABS: { key: ViewTab; label: string; icon: string }[] = [
  { key: "map", label: "Portfolio Map", icon: "🗺" },
  { key: "3d", label: "3D Subsurface", icon: "🧊" },
  { key: "detail", label: "Prospect Detail", icon: "📊" },
  { key: "optimizer", label: "Optimizer", icon: "⚡" },
  { key: "scenarios", label: "Scenarios", icon: "🔀" },
  { key: "summary", label: "Executive Summary", icon: "📋" },
];

export function DemoExplorer({ demoData, scenarioName, onStartOwn, onSwitchDemo }: DemoExplorerProps) {
  const [activeTab, setActiveTab] = useState<ViewTab>("map");
  const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null);
  const [activeScenario, setActiveScenario] = useState(
    demoData.results.scenario_comparison.scenario_results[0]?.scenario_name || "Base Case"
  );

  const scenarios = demoData.results.scenario_comparison.scenario_results.map((s) => s.scenario_name);

  // Compute portfolio summary stats
  const baseResult = demoData.results.scenario_comparison.scenario_results.find(
    (s) => s.scenario_name === activeScenario
  );
  const portfolioNPV = baseResult?.optimization_result.recommended_portfolio.expected_npv ?? 0;
  const capitalDeployed = baseResult?.optimization_result.recommended_portfolio.capital_deployed ?? 0;

  const handleSelectProspect = (id: string) => {
    setSelectedProspectId(id);
    if (activeTab !== "detail") setActiveTab("detail");
  };

  return (
    <div className="min-h-screen bg-bg text-slate-100 flex flex-col">
      <DemoBanner scenarioName={scenarioName} onStartOwn={onStartOwn} onSwitchDemo={onSwitchDemo} />

      {/* Summary bar */}
      <div className="flex items-center gap-6 px-4 py-2 border-b border-slate-800/60 bg-panel/40 text-xs">
        <div>
          <span className="text-slate-500">Portfolio NPV</span>{" "}
          <span className="text-drill font-semibold">{formatCurrency(portfolioNPV)}</span>
        </div>
        <div>
          <span className="text-slate-500">Capital Deployed</span>{" "}
          <span className="text-slate-200 font-semibold">{formatCurrency(capitalDeployed)}</span>
        </div>
        <div>
          <span className="text-slate-500">Prospects</span>{" "}
          <span className="text-slate-200 font-semibold">{demoData.input.prospects.length}</span>
        </div>
        <div>
          <span className="text-slate-500">Budget</span>{" "}
          <span className="text-slate-200 font-semibold">{formatCurrency(demoData.input.capital_budget)}</span>
        </div>

        {/* Scenario selector */}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-slate-500">Scenario:</span>
          <select
            value={activeScenario}
            onChange={(e) => setActiveScenario(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-xs text-slate-200"
          >
            {scenarios.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex border-b border-slate-800/60 px-4 bg-panel/20">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-drill text-drill"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            <span className="mr-1">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1">
        {activeTab === "map" && (
          <DemoPortfolioMap
            demoData={demoData}
            activeScenario={activeScenario}
            onSelectProspect={handleSelectProspect}
          />
        )}
        {activeTab === "3d" && (
          <SubsurfaceView
            demoData={demoData}
            activeScenario={activeScenario}
            onSelectProspect={handleSelectProspect}
          />
        )}
        {activeTab === "detail" && (
          <DemoProspectDetail
            demoData={demoData}
            activeScenario={activeScenario}
            selectedProspectId={selectedProspectId}
            onSelectProspect={setSelectedProspectId}
          />
        )}
        {activeTab === "optimizer" && (
          <DemoOptimizerView demoData={demoData} activeScenario={activeScenario} />
        )}
        {activeTab === "scenarios" && (
          <DemoScenarioDashboard demoData={demoData} />
        )}
        {activeTab === "summary" && (
          <DemoExecutiveSummary demoData={demoData} activeScenario={activeScenario} />
        )}
      </div>
    </div>
  );
}
