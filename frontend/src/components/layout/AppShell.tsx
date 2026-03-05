import { useState } from "react";
import { StepIndicator } from "./StepIndicator";
import { ModeToggle } from "./ModeToggle";
import { LandingPage } from "./LandingPage";
import { DemoExplorer } from "./DemoExplorer";
import { Step1_PortfolioSetup } from "../flow/Step1_PortfolioSetup";
import { Step2_ProspectDefinition } from "../flow/Step2_ProspectDefinition";
import { Step3_CommodityPricing } from "../flow/Step3_CommodityPricing";
import { Step4_BudgetConstraints } from "../flow/Step4_BudgetConstraints";
import { Step5_RunExplore } from "../flow/Step5_RunExplore";
import { useDemoMode } from "../../hooks/useDemoMode";

const steps = [Step1_PortfolioSetup, Step2_ProspectDefinition, Step3_CommodityPricing, Step4_BudgetConstraints, Step5_RunExplore];

export function AppShell() {
  const [current, setCurrent] = useState(0);
  const [mode, setMode] = useState<"quick" | "deep">("quick");
  const { state: demoState, launchDemo, startGuidedFlow, returnToLanding, switchDemo, meta } = useDemoMode();
  const Active = steps[current];

  // Landing page
  if (demoState.mode === "landing") {
    return (
      <LandingPage
        onStartAnalysis={startGuidedFlow}
        onLaunchDemo={launchDemo}
      />
    );
  }

  // Demo mode
  if (demoState.mode === "demo") {
    return (
      <DemoExplorer
        demoData={demoState.data}
        scenarioName={meta?.title || "Demo"}
        onStartOwn={startGuidedFlow}
        onSwitchDemo={switchDemo}
      />
    );
  }

  // Guided flow (existing behavior)
  return (
    <div className="min-h-screen bg-bg text-slate-100 p-4 md:p-8">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold cursor-pointer" onClick={returnToLanding}>prospect-engine</h1>
          <p className="text-slate-400 text-sm">Oil and gas exploration portfolio optimizer</p>
        </div>
        <ModeToggle mode={mode} setMode={setMode} />
      </header>
      <StepIndicator step={current + 1} total={steps.length} />
      <main className="mt-6 rounded-xl bg-panel border border-slate-800 p-4 md:p-6"><Active /></main>
      <footer className="mt-6 flex justify-between">
        <button className="px-4 py-2 rounded bg-slate-700 disabled:opacity-50" disabled={current === 0} onClick={() => setCurrent((s) => s - 1)}>Back</button>
        <button className="px-4 py-2 rounded bg-drill text-black disabled:opacity-50" disabled={current === steps.length - 1} onClick={() => setCurrent((s) => s + 1)}>Next</button>
      </footer>
    </div>
  );
}
