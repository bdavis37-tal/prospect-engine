export function StepIndicator({ step, total }: { step: number; total: number }) {
  return <div className="text-sm text-slate-300">Step {step} of {total}</div>;
}