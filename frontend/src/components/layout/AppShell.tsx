import { useDemoMode } from "../../hooks/useDemoMode";
import { LandingHero } from "./LandingHero";
import { CommandCenter } from "./CommandCenter";
import { DemoErrorBoundary } from "../shared/DemoErrorBoundary";
import { StepWizard } from "../flow/StepWizard";
import type { PortfolioState } from "../../types/portfolio";

export function AppShell() {
  const { state: demoState, launchDemo, startGuidedFlow, returnToLanding } =
    useDemoMode();

  const handleWizardComplete = (_portfolio: PortfolioState) => {
    // After the wizard finishes, return to landing for now.
    // A future task can wire this into a results view.
    returnToLanding();
  };

  // Landing page
  if (demoState.mode === "landing") {
    return (
      <LandingHero
        onStartAnalysis={startGuidedFlow}
        onLaunchDemo={launchDemo}
      />
    );
  }

  // Demo mode — wrapped in error boundary
  if (demoState.mode === "demo") {
    return (
      <DemoErrorBoundary onReturnToLanding={returnToLanding}>
        <CommandCenter
          demoData={demoState.data}
          onReturnToLanding={returnToLanding}
        />
      </DemoErrorBoundary>
    );
  }

  // Guided wizard flow
  return (
    <StepWizard
      onComplete={handleWizardComplete}
      onCancel={returnToLanding}
    />
  );
}
