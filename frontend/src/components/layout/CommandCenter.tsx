import { lazy, Suspense, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { DemoData } from "../../types/demo";
import type { ViewId } from "../../types/command-center";
import { useCommandCenter } from "../../hooks/useCommandCenter";
import { durations } from "../../styles/tokens";
import { NavigationRail } from "./NavigationRail";
import { ContextPanel } from "./ContextPanel";
import { StatusBar } from "./StatusBar";
import { CommandBar } from "./CommandBar";

// ---------------------------------------------------------------------------
// Lazy-loaded view components
// ---------------------------------------------------------------------------

const DemoPortfolioMap = lazy(() =>
  import("../views/DemoPortfolioMap").then((m) => ({ default: m.DemoPortfolioMap })),
);
const SubsurfaceView = lazy(() =>
  import("../views/SubsurfaceView").then((m) => ({ default: m.SubsurfaceView })),
);
const DemoOptimizerView = lazy(() =>
  import("../views/DemoOptimizerView").then((m) => ({ default: m.DemoOptimizerView })),
);
const DemoScenarioDashboard = lazy(() =>
  import("../views/DemoScenarioDashboard").then((m) => ({ default: m.DemoScenarioDashboard })),
);
const DemoExecutiveSummary = lazy(() =>
  import("../views/DemoExecutiveSummary").then((m) => ({ default: m.DemoExecutiveSummary })),
);

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CommandCenterProps {
  demoData: DemoData;
  initialView?: ViewId;
  onReturnToLanding: () => void;
}

// ---------------------------------------------------------------------------
// Loading fallback
// ---------------------------------------------------------------------------

function ViewLoadingFallback() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-surface-border-subtle border-t-surface-border-focus" />
        <p className="text-caption text-text-tertiary">Loading view…</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Framer-motion transition variants (GPU-composited: transform + opacity)
// ---------------------------------------------------------------------------

const viewVariants = {
  enter: (direction: "forward" | "backward") => ({
    opacity: 0,
    transform: `translateX(${direction === "forward" ? "24px" : "-24px"}) scale(0.98)`,
  }),
  idle: {
    opacity: 1,
    transform: "translateX(0px) scale(1)",
  },
  exit: (direction: "forward" | "backward") => ({
    opacity: 0,
    transform: `translateX(${direction === "forward" ? "-24px" : "24px"}) scale(0.98)`,
  }),
};

const viewTransition = {
  duration: durations.normal,
  ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
};

// ---------------------------------------------------------------------------
// Compact Header
// ---------------------------------------------------------------------------

function CompactHeader({
  activeScenario,
  onToggleCommandBar,
  onReturnToLanding,
}: {
  activeScenario: string;
  onToggleCommandBar: () => void;
  onReturnToLanding: () => void;
}) {
  return (
    <header className="flex h-12 items-center gap-4 border-b border-surface-border-subtle bg-surface-raised px-4">
      {/* Logo / Home */}
      <button
        type="button"
        onClick={onReturnToLanding}
        className="flex items-center gap-2 text-sm font-semibold text-text-primary transition-colors hover:text-data-info focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-border-focus"
        aria-label="Return to landing page"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
        <span className="hidden sm:inline">Prospect Engine</span>
      </button>

      {/* Scenario indicator */}
      <div className="hidden items-center gap-1.5 sm:flex">
        <span className="text-caption text-text-tertiary">Scenario:</span>
        <span className="font-mono text-caption font-medium text-data-info">
          {activeScenario}
        </span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Command bar trigger */}
      <button
        type="button"
        onClick={onToggleCommandBar}
        className="flex items-center gap-2 rounded-radius-md border border-surface-border-subtle bg-surface-base px-3 py-1.5 text-sm text-text-tertiary transition-colors hover:border-surface-border-default hover:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-border-focus"
        aria-label="Open command palette"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <span className="hidden md:inline">Search…</span>
        <kbd className="hidden rounded bg-surface-interactive px-1.5 py-0.5 font-mono text-[11px] md:inline-block">
          ⌘K
        </kbd>
      </button>
    </header>
  );
}

// ---------------------------------------------------------------------------
// View Renderer — renders the active view with AnimatePresence crossfade
// ---------------------------------------------------------------------------

function ViewRenderer({
  activeView,
  direction,
  demoData,
  activeScenario,
  onSelectProspect,
}: {
  activeView: ViewId;
  direction: "forward" | "backward";
  demoData: DemoData;
  activeScenario: string;
  onSelectProspect: (id: string) => void;
}) {
  const viewElement = useMemo(() => {
    switch (activeView) {
      case "map":
        return (
          <DemoPortfolioMap
            demoData={demoData}
            activeScenario={activeScenario}
            onSelectProspect={onSelectProspect}
          />
        );
      case "subsurface":
        return (
          <SubsurfaceView
            demoData={demoData}
            activeScenario={activeScenario}
            onSelectProspect={onSelectProspect}
          />
        );
      case "optimizer":
        return (
          <DemoOptimizerView
            demoData={demoData}
            activeScenario={activeScenario}
          />
        );
      case "scenarios":
        return <DemoScenarioDashboard demoData={demoData} />;
      case "summary":
        return (
          <DemoExecutiveSummary
            demoData={demoData}
            activeScenario={activeScenario}
          />
        );
    }
  }, [activeView, demoData, activeScenario, onSelectProspect]);

  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={activeView}
        custom={direction}
        variants={viewVariants}
        initial="enter"
        animate="idle"
        exit="exit"
        transition={viewTransition}
        className="h-full w-full will-change-transform"
      >
        <Suspense fallback={<ViewLoadingFallback />}>
          {viewElement}
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// StatusBar props computation
// ---------------------------------------------------------------------------

function computeStatusBarProps(demoData: DemoData, activeScenario: string) {
  const scenarioResult = demoData.results.scenario_comparison.scenario_results.find(
    (s) => s.scenario_name === activeScenario,
  );

  const recommended = scenarioResult?.optimization_result.recommended_portfolio;

  const portfolioNPV = recommended?.expected_npv ?? 0;
  const capitalDeployed = recommended?.capital_deployed ?? 0;
  const capitalRemaining = recommended?.capital_remaining ?? demoData.input.capital_budget;
  const prospectCount = demoData.input.prospects.length;

  // Derive risk level from portfolio risk metric
  const portfolioRisk = recommended?.portfolio_risk ?? 0;
  let riskLevel: "low" | "moderate" | "high" = "low";
  if (portfolioRisk > 0.6) riskLevel = "high";
  else if (portfolioRisk > 0.3) riskLevel = "moderate";

  return {
    portfolioNPV,
    capitalDeployed,
    capitalRemaining,
    prospectCount,
    activeScenario,
    riskLevel,
  };
}

// ---------------------------------------------------------------------------
// CommandCenter Component
// ---------------------------------------------------------------------------

export function CommandCenter({
  demoData,
  onReturnToLanding,
}: CommandCenterProps) {
  const {
    activeView,
    transition,
    contextPanel,
    commandBarOpen,
    activeScenario,
    navigate,
    toggleCommandBar,
    openContextPanel,
    closeContextPanel,
    setActiveScenario,
    handleCommandAction,
  } = useCommandCenter(demoData);

  // Compute StatusBar metrics from demo data
  const statusBarProps = useMemo(
    () => computeStatusBarProps(demoData, activeScenario),
    [demoData, activeScenario],
  );

  // Determine if there are fragile prospects (for NavigationRail alerts)
  const hasAlerts = demoData.results.scenario_comparison.fragile_prospects.length > 0;

  return (
    <div className="flex h-screen flex-col bg-surface-base">
      {/* Compact Header */}
      <CompactHeader
        activeScenario={activeScenario}
        onToggleCommandBar={toggleCommandBar}
        onReturnToLanding={onReturnToLanding}
      />

      {/* Main workspace area: rail + content + context panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Rail */}
        <NavigationRail
          activeView={activeView}
          onNavigate={navigate}
          prospectCount={demoData.input.prospects.length}
          hasAlerts={hasAlerts}
        />

        {/* Main Content Area */}
        <main className="relative flex-1 overflow-hidden">
          <ViewRenderer
            activeView={activeView}
            direction={transition.direction}
            demoData={demoData}
            activeScenario={activeScenario}
            onSelectProspect={openContextPanel}
          />
        </main>

        {/* Context Panel (collapsible) */}
        <ContextPanel
          open={contextPanel.open}
          onToggle={closeContextPanel}
          prospectId={contextPanel.prospectId}
          demoData={demoData}
          activeScenario={activeScenario}
          onNavigateToProspect={openContextPanel}
        />
      </div>

      {/* Status Bar */}
      <StatusBar
        {...statusBarProps}
        onScenarioChange={setActiveScenario}
      />

      {/* Command Bar Overlay */}
      <CommandBar
        open={commandBarOpen}
        onClose={toggleCommandBar}
        demoData={demoData}
        onAction={handleCommandAction}
      />
    </div>
  );
}

export default CommandCenter;
