import { useAnimatedValue } from "../../hooks/useAnimatedValue";
import { formatCurrency } from "../../lib/formatters";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface StatusBarProps {
  portfolioNPV: number;
  capitalDeployed: number;
  capitalRemaining: number;
  prospectCount: number;
  activeScenario: string;
  riskLevel: "low" | "moderate" | "high";
  onScenarioChange: (scenario: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RISK_STYLES: Record<StatusBarProps["riskLevel"], string> = {
  low: "text-data-positive",
  moderate: "text-data-highlight",
  high: "text-data-negative",
};

const RISK_DOT_STYLES: Record<StatusBarProps["riskLevel"], string> = {
  low: "bg-data-positive",
  moderate: "bg-data-highlight",
  high: "bg-data-negative",
};

function formatCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (abs >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toFixed(0);
}

function formatDollar(value: number): string {
  return `$${formatCompact(value)}`;
}

function formatCount(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

// ---------------------------------------------------------------------------
// Metric Item
// ---------------------------------------------------------------------------

interface MetricItemProps {
  label: string;
  value: string;
  className?: string;
}

function MetricItem({ label, value, className = "" }: MetricItemProps) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-caption text-text-tertiary">{label}</span>
      <span className={`font-mono text-caption font-semibold text-text-primary ${className}`}>
        {value}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatusBar Component
// ---------------------------------------------------------------------------

export function StatusBar({
  portfolioNPV,
  capitalDeployed,
  capitalRemaining,
  prospectCount,
  activeScenario,
  riskLevel,
}: StatusBarProps) {
  // Animated values for smooth count-up transitions
  const animatedNPV = useAnimatedValue(portfolioNPV);
  const animatedDeployed = useAnimatedValue(capitalDeployed);
  const animatedRemaining = useAnimatedValue(capitalRemaining);
  const animatedCount = useAnimatedValue(prospectCount);

  return (
    <footer
      role="status"
      aria-label="Portfolio metrics"
      className="flex w-full items-center gap-4 border-t border-border-subtle bg-surface-raised px-4 py-2 md:gap-6"
    >
      {/* Portfolio NPV */}
      <MetricItem label="NPV" value={formatDollar(animatedNPV)} />

      {/* Divider */}
      <div className="hidden h-3.5 w-px bg-border-subtle sm:block" aria-hidden="true" />

      {/* Capital Deployed */}
      <MetricItem label="Deployed" value={formatDollar(animatedDeployed)} />

      {/* Divider */}
      <div className="hidden h-3.5 w-px bg-border-subtle sm:block" aria-hidden="true" />

      {/* Capital Remaining */}
      <MetricItem label="Remaining" value={formatDollar(animatedRemaining)} />

      {/* Divider */}
      <div className="hidden h-3.5 w-px bg-border-subtle sm:block" aria-hidden="true" />

      {/* Prospect Count */}
      <MetricItem label="Prospects" value={formatCount(animatedCount)} />

      {/* Divider */}
      <div className="hidden h-3.5 w-px bg-border-subtle sm:block" aria-hidden="true" />

      {/* Active Scenario */}
      <div className="flex items-center gap-1.5">
        <span className="text-caption text-text-tertiary">Scenario</span>
        <span className="font-mono text-caption font-semibold text-data-info">
          {activeScenario}
        </span>
      </div>

      {/* Spacer pushes risk level to the right */}
      <div className="flex-1" />

      {/* Risk Level */}
      <div className="flex items-center gap-1.5">
        <span
          className={`h-2 w-2 rounded-full ${RISK_DOT_STYLES[riskLevel]}`}
          aria-hidden="true"
        />
        <span className="text-caption text-text-tertiary">Risk</span>
        <span
          className={`font-mono text-caption font-semibold capitalize ${RISK_STYLES[riskLevel]}`}
          data-positive={riskLevel === "low" ? "" : undefined}
          data-highlight={riskLevel === "moderate" ? "" : undefined}
          data-negative={riskLevel === "high" ? "" : undefined}
        >
          {riskLevel}
        </span>
      </div>
    </footer>
  );
}

export default StatusBar;
