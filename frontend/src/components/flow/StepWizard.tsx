import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { validateStep } from "../../lib/stepValidation";
import { optimizePortfolio } from "../../lib/api";
import type { PortfolioState } from "../../types/portfolio";
import type { ValidationResult } from "../../types/command-center";
import { durations } from "../../styles/tokens";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface StepWizardProps {
  onComplete: (portfolio: PortfolioState) => void;
  onCancel: () => void;
}

// ---------------------------------------------------------------------------
// Step metadata
// ---------------------------------------------------------------------------

interface StepMeta {
  title: string;
  subtitle: string;
}

const STEPS: StepMeta[] = [
  { title: "Portfolio Setup", subtitle: "Name, basin, and budget" },
  { title: "Prospect Definition", subtitle: "Add and edit prospects" },
  { title: "Commodity Pricing", subtitle: "Select price scenarios" },
  { title: "Budget & Constraints", subtitle: "Discount rate and constraints" },
  { title: "Run & Explore", subtitle: "Review and submit" },
];

// ---------------------------------------------------------------------------
// Default portfolio state
// ---------------------------------------------------------------------------

function defaultPortfolio(): PortfolioState {
  return {
    mode: "deep",
    prospects: [],
    selectedScenarios: [],
    budget: 0,
    discountRate: 0.1,
  };
}

// ---------------------------------------------------------------------------
// Breadcrumb
// ---------------------------------------------------------------------------

function Breadcrumb({
  steps,
  currentStep,
  completedSteps,
  onNavigate,
}: {
  steps: StepMeta[];
  currentStep: number;
  completedSteps: Set<number>;
  onNavigate: (step: number) => void;
}) {
  return (
    <nav aria-label="Wizard progress" className="flex items-center gap-1 mb-6">
      {steps.map((step, idx) => {
        const isCompleted = completedSteps.has(idx);
        const isCurrent = idx === currentStep;
        const isClickable = isCompleted;

        return (
          <div key={idx} className="flex items-center">
            {idx > 0 && (
              <div
                className={`w-6 h-px mx-1 ${
                  isCompleted || isCurrent
                    ? "bg-border-focus"
                    : "bg-border-subtle"
                }`}
              />
            )}
            <button
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onNavigate(idx)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                isCurrent
                  ? "bg-surface-interactive text-text-primary font-medium"
                  : isCompleted
                    ? "text-data-positive hover:bg-surface-interactive cursor-pointer"
                    : "text-text-tertiary cursor-default"
              }`}
              aria-current={isCurrent ? "step" : undefined}
            >
              <span
                className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                  isCompleted
                    ? "bg-data-positive/20 text-data-positive"
                    : isCurrent
                      ? "bg-border-focus/20 text-border-focus"
                      : "bg-surface-overlay text-text-tertiary"
                }`}
              >
                {isCompleted ? "✓" : idx + 1}
              </span>
              <span className="hidden sm:inline">{step.title}</span>
            </button>
          </div>
        );
      })}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Live Preview Pane
// ---------------------------------------------------------------------------

function LivePreview({ portfolio }: { portfolio: PortfolioState }) {
  return (
    <div className="h-full rounded-lg bg-surface-raised border border-border-subtle p-6 flex flex-col gap-4">
      <h3 className="text-text-primary font-medium text-lg">Live Preview</h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-md bg-surface-overlay p-4 border border-border-subtle">
          <p className="text-text-tertiary text-xs uppercase tracking-wide mb-1">
            Prospects
          </p>
          <p className="text-text-primary text-2xl font-semibold">
            {portfolio.prospects.length}
          </p>
        </div>

        <div className="rounded-md bg-surface-overlay p-4 border border-border-subtle">
          <p className="text-text-tertiary text-xs uppercase tracking-wide mb-1">
            Budget
          </p>
          <p className="text-text-primary text-2xl font-semibold">
            {portfolio.budget > 0
              ? `$${(portfolio.budget / 1_000_000).toFixed(1)}M`
              : "—"}
          </p>
        </div>

        <div className="rounded-md bg-surface-overlay p-4 border border-border-subtle">
          <p className="text-text-tertiary text-xs uppercase tracking-wide mb-1">
            Scenarios
          </p>
          <p className="text-text-primary text-2xl font-semibold">
            {portfolio.selectedScenarios.length}
          </p>
        </div>

        <div className="rounded-md bg-surface-overlay p-4 border border-border-subtle">
          <p className="text-text-tertiary text-xs uppercase tracking-wide mb-1">
            Discount Rate
          </p>
          <p className="text-text-primary text-2xl font-semibold">
            {(portfolio.discountRate * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {portfolio.prospects.length > 0 && (
        <div className="flex-1 rounded-md bg-surface-overlay p-4 border border-border-subtle overflow-auto">
          <p className="text-text-tertiary text-xs uppercase tracking-wide mb-2">
            Prospects
          </p>
          <ul className="space-y-1">
            {portfolio.prospects.map((p) => (
              <li
                key={p.prospect_id}
                className="text-text-secondary text-sm flex justify-between"
              >
                <span>{p.name || "(unnamed)"}</span>
                <span className="text-text-tertiary">
                  {p.latitude.toFixed(1)}°, {p.longitude.toFixed(1)}°
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline validation messages
// ---------------------------------------------------------------------------

function ValidationMessages({ result }: { result: ValidationResult | null }) {
  if (!result) return null;

  return (
    <div className="space-y-2 mt-4">
      {result.errors.map((err, i) => (
        <div
          key={`err-${i}`}
          className="flex items-start gap-2 text-sm text-data-negative bg-data-negative/10 border border-data-negative/20 rounded-md px-3 py-2"
          role="alert"
        >
          <span className="shrink-0 mt-0.5">✕</span>
          <span>
            <strong>{err.field}:</strong> {err.message}
          </span>
        </div>
      ))}
      {result.warnings.map((warn, i) => (
        <div
          key={`warn-${i}`}
          className="flex items-start gap-2 text-sm text-data-highlight bg-data-highlight/10 border border-data-highlight/20 rounded-md px-3 py-2"
          role="status"
        >
          <span className="shrink-0 mt-0.5">⚠</span>
          <span>
            <strong>{warn.field}:</strong> {warn.message}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step content placeholders (delegate to existing Step components)
// ---------------------------------------------------------------------------

/**
 * Renders the form controls for a given step.
 * Each step provides basic interactive controls that update the portfolio state.
 * The existing Step1-Step5 skeleton components are referenced but the actual
 * form controls are implemented inline here for the wizard flow.
 */
function StepContent({
  stepIndex,
  portfolio,
  onChange,
}: {
  stepIndex: number;
  portfolio: PortfolioState;
  onChange: (updated: Partial<PortfolioState>) => void;
}) {
  switch (stepIndex) {
    case 0:
      return (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">
            Portfolio Setup
          </h2>
          <p className="text-text-secondary text-sm">
            Choose a basin and set your exploration budget.
          </p>
          <div className="space-y-3">
            <label className="block">
              <span className="text-text-secondary text-sm">Budget ($)</span>
              <input
                type="number"
                min={0}
                value={portfolio.budget || ""}
                onChange={(e) =>
                  onChange({ budget: parseFloat(e.target.value) || 0 })
                }
                className="mt-1 w-full rounded-md bg-surface-overlay border border-border-default px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
                placeholder="e.g. 50000000"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                const id = `p-${Date.now()}`;
                onChange({
                  prospects: [
                    ...portfolio.prospects,
                    {
                      prospect_id: id,
                      name: `Prospect ${portfolio.prospects.length + 1}`,
                      basin: "Permian",
                      latitude: 31.5,
                      longitude: -103.5,
                    },
                  ],
                });
              }}
              className="px-4 py-2 rounded-md bg-border-focus text-text-primary text-sm hover:bg-border-focus/80 transition-colors"
            >
              + Add Prospect
            </button>
          </div>
        </div>
      );

    case 1:
      return (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">
            Prospect Definition
          </h2>
          <p className="text-text-secondary text-sm">
            Define each prospect's name and location.
          </p>
          {portfolio.prospects.length === 0 ? (
            <p className="text-text-tertiary text-sm italic">
              No prospects added yet. Go back to add prospects.
            </p>
          ) : (
            <div className="space-y-3">
              {portfolio.prospects.map((p, i) => (
                <div
                  key={p.prospect_id}
                  className="rounded-md bg-surface-overlay border border-border-subtle p-3 space-y-2"
                >
                  <label className="block">
                    <span className="text-text-secondary text-xs">Name</span>
                    <input
                      type="text"
                      value={p.name}
                      onChange={(e) => {
                        const updated = [...portfolio.prospects];
                        updated[i] = { ...p, name: e.target.value };
                        onChange({ prospects: updated });
                      }}
                      className="mt-1 w-full rounded-md bg-surface-base border border-border-default px-3 py-1.5 text-sm text-text-primary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className="text-text-secondary text-xs">
                        Latitude
                      </span>
                      <input
                        type="number"
                        min={-90}
                        max={90}
                        step={0.1}
                        value={p.latitude}
                        onChange={(e) => {
                          const updated = [...portfolio.prospects];
                          updated[i] = {
                            ...p,
                            latitude: parseFloat(e.target.value) || 0,
                          };
                          onChange({ prospects: updated });
                        }}
                        className="mt-1 w-full rounded-md bg-surface-base border border-border-default px-3 py-1.5 text-sm text-text-primary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
                      />
                    </label>
                    <label className="block">
                      <span className="text-text-secondary text-xs">
                        Longitude
                      </span>
                      <input
                        type="number"
                        min={-180}
                        max={180}
                        step={0.1}
                        value={p.longitude}
                        onChange={(e) => {
                          const updated = [...portfolio.prospects];
                          updated[i] = {
                            ...p,
                            longitude: parseFloat(e.target.value) || 0,
                          };
                          onChange({ prospects: updated });
                        }}
                        className="mt-1 w-full rounded-md bg-surface-base border border-border-default px-3 py-1.5 text-sm text-text-primary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );

    case 2:
      return (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">
            Commodity Pricing
          </h2>
          <p className="text-text-secondary text-sm">
            Select one or more price scenarios for simulation.
          </p>
          <div className="space-y-2">
            {["base", "bull", "bear", "crash", "volatile"].map((scenario) => {
              const selected = portfolio.selectedScenarios.includes(scenario);
              return (
                <label
                  key={scenario}
                  className={`flex items-center gap-3 rounded-md border px-4 py-3 cursor-pointer transition-colors ${
                    selected
                      ? "bg-border-focus/10 border-border-focus text-text-primary"
                      : "bg-surface-overlay border-border-subtle text-text-secondary hover:border-border-default"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => {
                      const updated = selected
                        ? portfolio.selectedScenarios.filter(
                            (s) => s !== scenario
                          )
                        : [...portfolio.selectedScenarios, scenario];
                      onChange({ selectedScenarios: updated });
                    }}
                    className="accent-border-focus"
                  />
                  <span className="capitalize">{scenario}</span>
                </label>
              );
            })}
          </div>
        </div>
      );

    case 3:
      return (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">
            Budget & Constraints
          </h2>
          <p className="text-text-secondary text-sm">
            Set the discount rate and any additional constraints.
          </p>
          <label className="block">
            <span className="text-text-secondary text-sm">
              Discount Rate (0–1)
            </span>
            <input
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={portfolio.discountRate}
              onChange={(e) =>
                onChange({
                  discountRate: parseFloat(e.target.value) || 0,
                })
              }
              className="mt-1 w-full rounded-md bg-surface-overlay border border-border-default px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
            />
          </label>
        </div>
      );

    case 4:
      return (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">
            Run & Explore
          </h2>
          <p className="text-text-secondary text-sm">
            Review your portfolio configuration and submit for simulation.
          </p>
          <div className="rounded-md bg-surface-overlay border border-border-subtle p-4 space-y-2 text-sm">
            <p className="text-text-secondary">
              <strong className="text-text-primary">Prospects:</strong>{" "}
              {portfolio.prospects.length}
            </p>
            <p className="text-text-secondary">
              <strong className="text-text-primary">Budget:</strong> $
              {portfolio.budget.toLocaleString()}
            </p>
            <p className="text-text-secondary">
              <strong className="text-text-primary">Scenarios:</strong>{" "}
              {portfolio.selectedScenarios.join(", ") || "None"}
            </p>
            <p className="text-text-secondary">
              <strong className="text-text-primary">Discount Rate:</strong>{" "}
              {(portfolio.discountRate * 100).toFixed(0)}%
            </p>
          </div>
        </div>
      );

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Framer-motion transition variants
// ---------------------------------------------------------------------------

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
  }),
};

const stepTransition = {
  duration: durations.normal,
  ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
};

// ---------------------------------------------------------------------------
// Main StepWizard component
// ---------------------------------------------------------------------------

export function StepWizard({ onComplete, onCancel }: StepWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(
    () => new Set()
  );
  const [portfolio, setPortfolio] = useState<PortfolioState>(defaultPortfolio);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Debounced preview state
  const [previewPortfolio, setPreviewPortfolio] =
    useState<PortfolioState>(portfolio);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce live preview updates at 300ms
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setPreviewPortfolio(portfolio);
    }, 300);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [portfolio]);

  // Handle portfolio field changes
  const handleChange = useCallback(
    (updates: Partial<PortfolioState>) => {
      setPortfolio((prev) => ({ ...prev, ...updates }));
      // Clear validation when user edits
      setValidation(null);
      setApiError(null);
    },
    []
  );

  // Validate and advance to next step
  const handleNext = useCallback(() => {
    const result = validateStep(currentStep, portfolio);
    setValidation(result);

    if (!result.valid) {
      return; // Block advancement
    }

    // Mark current step as completed
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      next.add(currentStep);
      return next;
    });

    if (currentStep < STEPS.length - 1) {
      setDirection(1);
      setCurrentStep((prev) => prev + 1);
      setValidation(null);
    }
  }, [currentStep, portfolio]);

  // Navigate back
  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
      setValidation(null);
    }
  }, [currentStep]);

  // Navigate to a completed step via breadcrumb
  const handleBreadcrumbNavigate = useCallback(
    (step: number) => {
      if (completedSteps.has(step)) {
        setDirection(step < currentStep ? -1 : 1);
        setCurrentStep(step);
        setValidation(null);
      }
    },
    [completedSteps, currentStep]
  );

  // Submit on final step
  const handleSubmit = useCallback(async () => {
    // Validate final step first
    const result = validateStep(currentStep, portfolio);
    setValidation(result);
    if (!result.valid) return;

    setSubmitting(true);
    setApiError(null);

    try {
      await optimizePortfolio(portfolio);
      // Mark final step completed
      setCompletedSteps((prev) => {
        const next = new Set(prev);
        next.add(currentStep);
        return next;
      });
      onComplete(portfolio);
    } catch (err) {
      setApiError(
        err instanceof Error ? err.message : "Simulation failed. Please retry."
      );
    } finally {
      setSubmitting(false);
    }
  }, [currentStep, portfolio, onComplete]);

  const isFinalStep = currentStep === STEPS.length - 1;

  return (
    <div className="flex flex-col h-full bg-surface-base">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">
            New Analysis
          </h1>
          <p className="text-text-tertiary text-sm">
            Step {currentStep + 1} of {STEPS.length} —{" "}
            {STEPS[currentStep].subtitle}
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-interactive transition-colors text-sm"
        >
          Cancel
        </button>
      </div>

      {/* Breadcrumb */}
      <div className="px-6 pt-4">
        <Breadcrumb
          steps={STEPS}
          currentStep={currentStep}
          completedSteps={completedSteps}
          onNavigate={handleBreadcrumbNavigate}
        />
      </div>

      {/* Split-pane layout */}
      <div className="flex-1 flex min-h-0 px-6 pb-6 gap-6">
        {/* Left: Form controls */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-auto">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentStep}
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={stepTransition}
                className="py-2"
              >
                <StepContent
                  stepIndex={currentStep}
                  portfolio={portfolio}
                  onChange={handleChange}
                />
              </motion.div>
            </AnimatePresence>

            {/* Validation messages */}
            <ValidationMessages result={validation} />

            {/* API error */}
            {apiError && (
              <div
                className="mt-4 flex items-start gap-2 text-sm text-data-negative bg-data-negative/10 border border-data-negative/20 rounded-md px-3 py-2"
                role="alert"
              >
                <span className="shrink-0 mt-0.5">✕</span>
                <span>{apiError}</span>
              </div>
            )}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-border-subtle mt-4">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 0}
              className="px-4 py-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-interactive transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Back
            </button>

            {isFinalStep ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-2 rounded-md bg-data-positive text-text-inverse font-medium text-sm hover:bg-data-positive/90 transition-colors disabled:opacity-60"
              >
                {submitting ? "Running…" : "Run Simulation"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2 rounded-md bg-border-focus text-text-primary font-medium text-sm hover:bg-border-focus/90 transition-colors"
              >
                Next →
              </button>
            )}
          </div>
        </div>

        {/* Right: Live preview */}
        <div className="w-80 lg:w-96 shrink-0 hidden md:block">
          <LivePreview portfolio={previewPortfolio} />
        </div>
      </div>
    </div>
  );
}
