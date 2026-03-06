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
  question: string;
}

const STEPS: StepMeta[] = [
  {
    title: "Portfolio Setup",
    subtitle: "Name, basin, and budget",
    question: "What are you evaluating?",
  },
  {
    title: "Prospect Definition",
    subtitle: "Add and edit prospects",
    question: "Tell us about your prospects",
  },
  {
    title: "Commodity Pricing",
    subtitle: "Select price scenarios",
    question: "What do you think prices will do?",
  },
  {
    title: "Budget & Constraints",
    subtitle: "Discount rate and constraints",
    question: "How much can you invest?",
  },
  {
    title: "Run & Explore",
    subtitle: "Review and submit",
    question: "Ready to optimize",
  },
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
// Progress Stepper
// ---------------------------------------------------------------------------

function ProgressStepper({
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
    <nav aria-label="Wizard progress" className="mx-auto flex w-full max-w-2xl items-center justify-between px-4">
      {steps.map((step, idx) => {
        const isCompleted = completedSteps.has(idx);
        const isCurrent = idx === currentStep;
        const isClickable = isCompleted;
        const isPast = idx < currentStep;

        return (
          <div key={idx} className="flex flex-1 items-center">
            <button
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onNavigate(idx)}
              className={`group relative flex flex-col items-center ${isClickable ? "cursor-pointer" : "cursor-default"}`}
              aria-current={isCurrent ? "step" : undefined}
              aria-label={`Step ${idx + 1}: ${step.title}${isCompleted ? " (completed)" : ""}`}
            >
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold transition-all duration-200 ${
                  isCompleted
                    ? "bg-[#23D18B]/15 text-[#23D18B] ring-2 ring-[#23D18B]/20"
                    : isCurrent
                      ? "bg-[#3b82f6]/15 text-[#3b82f6] ring-2 ring-[#3b82f6]/30"
                      : "bg-white/[0.04] text-white/30"
                }`}
              >
                {isCompleted ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                ) : (
                  idx + 1
                )}
              </div>
              <span className={`mt-1.5 hidden text-[10px] font-medium sm:block ${
                isCurrent ? "text-white/70" : isCompleted ? "text-white/50" : "text-white/25"
              }`}>
                {step.title}
              </span>
            </button>

            {idx < steps.length - 1 && (
              <div className="mx-2 h-px flex-1">
                <div
                  className={`h-full transition-all duration-300 ${
                    isPast || isCompleted ? "bg-[#23D18B]/30" : "bg-white/[0.06]"
                  }`}
                />
              </div>
            )}
          </div>
        );
      })}
    </nav>
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
          className="flex items-start gap-2 text-sm text-[#EF4444] bg-[#EF4444]/[0.08] border border-[#EF4444]/20 rounded-lg px-4 py-2.5"
          role="alert"
        >
          <span className="shrink-0 mt-0.5">✕</span>
          <span>
            <strong className="font-medium">{err.field}:</strong> {err.message}
          </span>
        </div>
      ))}
      {result.warnings.map((warn, i) => (
        <div
          key={`warn-${i}`}
          className="flex items-start gap-2 text-sm text-[#F59E0B] bg-[#F59E0B]/[0.08] border border-[#F59E0B]/20 rounded-lg px-4 py-2.5"
          role="status"
        >
          <span className="shrink-0 mt-0.5">⚠</span>
          <span>
            <strong className="font-medium">{warn.field}:</strong> {warn.message}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step content
// ---------------------------------------------------------------------------

function StepContent({
  stepIndex,
  portfolio,
  onChange,
}: {
  stepIndex: number;
  portfolio: PortfolioState;
  onChange: (updated: Partial<PortfolioState>) => void;
}) {
  const inputClasses = "mt-1.5 w-full rounded-lg bg-white/[0.04] border border-white/[0.08] px-4 py-3 text-sm text-white/90 placeholder:text-white/25 focus:border-[#3b82f6]/50 focus:outline-none focus:ring-1 focus:ring-[#3b82f6]/30 transition-colors";

  switch (stepIndex) {
    case 0:
      return (
        <div className="space-y-6">
          <div>
            <label className="block">
              <span className="text-xs font-medium text-white/50 uppercase tracking-wide">Capital Budget ($)</span>
              <input
                type="number"
                min={0}
                value={portfolio.budget || ""}
                onChange={(e) =>
                  onChange({ budget: parseFloat(e.target.value) || 0 })
                }
                className={inputClasses}
                placeholder="e.g. 50000000"
              />
            </label>
            <p className="mt-1.5 text-xs text-white/30">Your total drilling and completion budget for this evaluation period.</p>
          </div>

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
            className="inline-flex items-center gap-2 rounded-lg border border-dashed border-white/[0.12] bg-white/[0.02] px-5 py-3 text-sm font-medium text-white/60 transition-all duration-200 hover:border-white/[0.2] hover:bg-white/[0.04] hover:text-white/80"
          >
            + Add Prospect
          </button>

          {portfolio.prospects.length > 0 && (
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-xs font-medium text-white/40 mb-3">
                {portfolio.prospects.length} prospect{portfolio.prospects.length !== 1 ? "s" : ""} added
              </p>
              <div className="flex flex-wrap gap-2">
                {portfolio.prospects.map((p) => (
                  <span
                    key={p.prospect_id}
                    className="inline-flex items-center gap-1.5 rounded-md bg-white/[0.04] px-3 py-1.5 text-xs text-white/60"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-[#3b82f6]" />
                    {p.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      );

    case 1:
      return (
        <div className="space-y-4">
          {portfolio.prospects.length === 0 ? (
            <p className="text-sm text-white/40 italic">
              No prospects added yet. Go back to add prospects.
            </p>
          ) : (
            <div className="space-y-3">
              {portfolio.prospects.map((p, i) => (
                <div
                  key={p.prospect_id}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:border-white/[0.1]"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#3b82f6]/10 text-xs font-semibold text-[#3b82f6]">
                      {i + 1}
                    </div>
                    <input
                      type="text"
                      value={p.name}
                      onChange={(e) => {
                        const updated = [...portfolio.prospects];
                        updated[i] = { ...p, name: e.target.value };
                        onChange({ prospects: updated });
                      }}
                      className="flex-1 bg-transparent text-sm font-medium text-white/80 placeholder:text-white/25 focus:outline-none"
                      placeholder="Prospect name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-[10px] font-medium text-white/35 uppercase tracking-wide">Latitude</span>
                      <input
                        type="number"
                        min={-90}
                        max={90}
                        step={0.1}
                        value={p.latitude}
                        onChange={(e) => {
                          const updated = [...portfolio.prospects];
                          updated[i] = { ...p, latitude: parseFloat(e.target.value) || 0 };
                          onChange({ prospects: updated });
                        }}
                        className="mt-1 w-full rounded-md bg-white/[0.04] border border-white/[0.06] px-3 py-2 text-xs text-white/80 focus:border-[#3b82f6]/50 focus:outline-none"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-medium text-white/35 uppercase tracking-wide">Longitude</span>
                      <input
                        type="number"
                        min={-180}
                        max={180}
                        step={0.1}
                        value={p.longitude}
                        onChange={(e) => {
                          const updated = [...portfolio.prospects];
                          updated[i] = { ...p, longitude: parseFloat(e.target.value) || 0 };
                          onChange({ prospects: updated });
                        }}
                        className="mt-1 w-full rounded-md bg-white/[0.04] border border-white/[0.06] px-3 py-2 text-xs text-white/80 focus:border-[#3b82f6]/50 focus:outline-none"
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
        <div className="space-y-3">
          {["base", "bull", "bear", "crash", "volatile"].map((scenario) => {
            const selected = portfolio.selectedScenarios.includes(scenario);
            const descriptions: Record<string, string> = {
              base: "Steady growth, balanced supply and demand",
              bull: "Strong demand, supply constraints drive prices higher",
              bear: "Oversupply, weak demand pushes prices lower",
              crash: "Severe downturn, prices collapse",
              volatile: "High uncertainty with wide price swings",
            };
            return (
              <label
                key={scenario}
                className={`group flex items-center gap-4 rounded-xl border px-5 py-4 cursor-pointer transition-all duration-200 ${
                  selected
                    ? "border-[#3b82f6]/30 bg-[#3b82f6]/[0.06]"
                    : "border-white/[0.06] bg-white/[0.01] hover:border-white/[0.1] hover:bg-white/[0.02]"
                }`}
              >
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${
                    selected
                      ? "border-[#3b82f6] bg-[#3b82f6]"
                      : "border-white/20 bg-transparent group-hover:border-white/30"
                  }`}
                >
                  {selected && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </div>
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => {
                    const updated = selected
                      ? portfolio.selectedScenarios.filter((s) => s !== scenario)
                      : [...portfolio.selectedScenarios, scenario];
                    onChange({ selectedScenarios: updated });
                  }}
                  className="sr-only"
                />
                <div className="flex-1">
                  <span className={`text-sm font-medium capitalize ${selected ? "text-white/90" : "text-white/60"}`}>
                    {scenario}
                  </span>
                  <p className="mt-0.5 text-xs text-white/35">{descriptions[scenario]}</p>
                </div>
              </label>
            );
          })}
        </div>
      );

    case 3:
      return (
        <div className="space-y-6">
          <label className="block">
            <span className="text-xs font-medium text-white/50 uppercase tracking-wide">Discount Rate</span>
            <div className="mt-3 flex items-center gap-4">
              <input
                type="range"
                min={0}
                max={0.25}
                step={0.005}
                value={portfolio.discountRate}
                onChange={(e) => onChange({ discountRate: parseFloat(e.target.value) })}
                className="flex-1 h-1.5 appearance-none rounded-full bg-white/[0.08] accent-[#3b82f6] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#3b82f6]"
              />
              <div className="flex h-10 w-20 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] font-mono text-lg font-semibold text-white/90">
                {(portfolio.discountRate * 100).toFixed(1)}%
              </div>
            </div>
            <p className="mt-2 text-xs text-white/30">Your required rate of return. Most E&P companies use 8-12%.</p>
          </label>
        </div>
      );

    case 4:
      return (
        <div className="space-y-6">
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-6">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Prospects", value: String(portfolio.prospects.length) },
                { label: "Budget", value: portfolio.budget > 0 ? `$${(portfolio.budget / 1_000_000).toFixed(1)}M` : "—" },
                { label: "Scenarios", value: String(portfolio.selectedScenarios.length) },
                { label: "Discount Rate", value: `${(portfolio.discountRate * 100).toFixed(0)}%` },
              ].map((item) => (
                <div key={item.label} className="rounded-lg bg-white/[0.03] p-3">
                  <p className="text-[10px] font-medium text-white/35 uppercase tracking-wide">{item.label}</p>
                  <p className="mt-1 text-lg font-semibold text-white/80">{item.value}</p>
                </div>
              ))}
            </div>
            {portfolio.selectedScenarios.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/[0.06]">
                <p className="text-xs text-white/35 mb-2">Price scenarios</p>
                <div className="flex flex-wrap gap-1.5">
                  {portfolio.selectedScenarios.map((s) => (
                    <span key={s} className="rounded-md bg-[#3b82f6]/10 px-2.5 py-1 text-xs font-medium capitalize text-[#3b82f6]/80">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
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
    x: direction > 0 ? 60 : -60,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -60 : 60,
    opacity: 0,
  }),
};

const stepTransition = {
  duration: durations.normal,
  ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
};

// ---------------------------------------------------------------------------
// Progress messages for simulation
// ---------------------------------------------------------------------------

const PROGRESS_MESSAGES = [
  "Simulating geological outcomes...",
  "Modeling price uncertainty...",
  "Calculating prospect economics...",
  "Optimizing portfolio allocation...",
  "Analyzing risk and sensitivity...",
];

function SimulationProgress() {
  const [messageIdx, setMessageIdx] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const msgInterval = setInterval(() => {
      setMessageIdx((prev) => Math.min(prev + 1, PROGRESS_MESSAGES.length - 1));
    }, 1200);

    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 1.5, 95));
    }, 100);

    return () => {
      clearInterval(msgInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="relative h-20 w-20">
        <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 36}`}
            strokeDashoffset={`${2 * Math.PI * 36 * (1 - progress / 100)}`}
            className="transition-all duration-200"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-white/70">
          {Math.round(progress)}%
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.p
          key={messageIdx}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          className="text-sm text-white/50"
        >
          {PROGRESS_MESSAGES[messageIdx]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

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
  const [direction, setDirection] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleChange = useCallback(
    (updates: Partial<PortfolioState>) => {
      setPortfolio((prev) => ({ ...prev, ...updates }));
      setValidation(null);
      setApiError(null);
    },
    []
  );

  const handleNext = useCallback(() => {
    const result = validateStep(currentStep, portfolio);
    setValidation(result);

    if (!result.valid) return;

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

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
      setValidation(null);
    }
  }, [currentStep]);

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

  const handleSubmit = useCallback(async () => {
    const result = validateStep(currentStep, portfolio);
    setValidation(result);
    if (!result.valid) return;

    setSubmitting(true);
    setApiError(null);

    try {
      await optimizePortfolio(portfolio);
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
    <div className="flex min-h-screen flex-col bg-[#06090E]">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/[0.04] hover:text-white/70"
            aria-label="Return to landing"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-base font-semibold text-white/90">New Analysis</h1>
            <p className="text-xs text-white/35">
              Step {currentStep + 1} of {STEPS.length}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-xs font-medium text-white/40 transition-colors hover:text-white/70"
        >
          Cancel
        </button>
      </header>

      {/* Progress stepper */}
      <div className="border-b border-white/[0.04] py-5">
        <ProgressStepper
          steps={STEPS}
          currentStep={currentStep}
          completedSteps={completedSteps}
          onNavigate={handleBreadcrumbNavigate}
        />
      </div>

      {/* Main content area */}
      <div className="flex flex-1 flex-col items-center justify-start px-6 py-10">
        <div className="w-full max-w-xl">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={stepTransition}
            >
              <h2 className="text-2xl font-bold text-white/90 sm:text-3xl">
                {STEPS[currentStep].question}
              </h2>
              <p className="mt-2 text-sm text-white/40">
                {STEPS[currentStep].subtitle}
              </p>

              <div className="mt-8">
                {submitting ? (
                  <SimulationProgress />
                ) : (
                  <StepContent
                    stepIndex={currentStep}
                    portfolio={portfolio}
                    onChange={handleChange}
                  />
                )}
              </div>

              <ValidationMessages result={validation} />

              {apiError && (
                <div
                  className="mt-4 flex items-start gap-2 text-sm text-[#EF4444] bg-[#EF4444]/[0.08] border border-[#EF4444]/20 rounded-lg px-4 py-2.5"
                  role="alert"
                >
                  <span>✕</span>
                  <span>{apiError}</span>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="border-t border-white/[0.06] px-6 py-4">
        <div className="mx-auto flex max-w-xl items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 0}
            className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white/50 transition-all duration-200 hover:bg-white/[0.04] hover:text-white/80 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            ← Back
          </button>

          {isFinalStep ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-[#23D18B] px-7 py-3 text-sm font-semibold text-[#0a0e14] shadow-[0_0_20px_rgba(35,209,139,0.2)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_30px_rgba(35,209,139,0.3)] disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {submitting ? "Running…" : "Run Optimization →"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-2 rounded-xl bg-[#3b82f6] px-7 py-3 text-sm font-semibold text-white shadow-[0_0_16px_rgba(59,130,246,0.2)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_24px_rgba(59,130,246,0.3)]"
            >
              Continue →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
