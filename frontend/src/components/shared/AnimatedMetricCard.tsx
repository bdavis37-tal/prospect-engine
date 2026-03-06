import { useMemo } from "react";
import { useAnimatedValue } from "../../hooks/useAnimatedValue";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AnimatedMetricCardProps {
  label: string;
  value: number;
  format: "currency" | "percentage" | "number";
  trend?: { direction: "up" | "down" | "flat"; magnitude: number };
  icon?: React.ComponentType<{ className?: string }>;
  accentColor?: string;
  size?: "sm" | "md" | "lg";
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000_000) {
    return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`;
  }
  if (abs >= 1_000_000) {
    return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  }
  return `${sign}$${abs.toFixed(0)}`;
}

function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatNumber(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

const FORMATTERS: Record<AnimatedMetricCardProps["format"], (v: number) => string> = {
  currency: formatCurrency,
  percentage: formatPercentage,
  number: formatNumber,
};

// ---------------------------------------------------------------------------
// Trend helpers
// ---------------------------------------------------------------------------

const TREND_ARROWS: Record<"up" | "down" | "flat", string> = {
  up: "↑",
  down: "↓",
  flat: "→",
};

const TREND_COLORS: Record<"up" | "down" | "flat", string> = {
  up: "text-data-positive",
  down: "text-data-negative",
  flat: "text-data-neutral",
};

// ---------------------------------------------------------------------------
// Size presets
// ---------------------------------------------------------------------------

interface SizePreset {
  card: string;
  label: string;
  value: string;
  trend: string;
  iconSize: string;
}

const SIZE_PRESETS: Record<"sm" | "md" | "lg", SizePreset> = {
  sm: {
    card: "px-3 py-2 gap-1",
    label: "text-caption",
    value: "text-body font-semibold",
    trend: "text-caption",
    iconSize: "h-4 w-4",
  },
  md: {
    card: "px-4 py-3 gap-1.5",
    label: "text-caption",
    value: "text-subheading font-semibold",
    trend: "text-caption",
    iconSize: "h-5 w-5",
  },
  lg: {
    card: "px-5 py-4 gap-2",
    label: "text-body",
    value: "text-heading font-semibold",
    trend: "text-body",
    iconSize: "h-6 w-6",
  },
};

// ---------------------------------------------------------------------------
// Reduced motion detection
// ---------------------------------------------------------------------------

function usePrefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// ---------------------------------------------------------------------------
// AnimatedMetricCard Component
// ---------------------------------------------------------------------------

export function AnimatedMetricCard({
  label,
  value,
  format,
  trend,
  icon: Icon,
  accentColor,
  size = "md",
}: AnimatedMetricCardProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const animatedValue = useAnimatedValue(value, 600, prefersReducedMotion);

  const formatter = FORMATTERS[format];
  const displayValue = formatter(animatedValue);
  const preset = SIZE_PRESETS[size];

  const accentStyle = useMemo(
    () => (accentColor ? { color: accentColor } : undefined),
    [accentColor],
  );

  return (
    <div
      className={`flex flex-col rounded-md border border-border-subtle bg-surface-raised ${preset.card}`}
      role="group"
      aria-label={`${label}: ${formatter(value)}`}
    >
      {/* Label row with optional icon */}
      <div className="flex items-center gap-1.5">
        {Icon && (
          <span className="text-text-tertiary" aria-hidden="true">
            <Icon className={preset.iconSize} />
          </span>
        )}
        <span className={`${preset.label} text-text-secondary`}>{label}</span>
      </div>

      {/* Animated value */}
      <span
        className={`font-mono ${preset.value} text-text-primary`}
        style={accentStyle}
        aria-hidden="true"
      >
        {displayValue}
      </span>

      {/* Screen-reader-only static value */}
      <span className="sr-only">{formatter(value)}</span>

      {/* Trend indicator */}
      {trend && (
        <div className={`flex items-center gap-1 ${preset.trend}`}>
          <span className={TREND_COLORS[trend.direction]} aria-hidden="true">
            {TREND_ARROWS[trend.direction]}
          </span>
          <span className={TREND_COLORS[trend.direction]}>
            {trend.magnitude.toFixed(1)}%
          </span>
          <span className="sr-only">
            {trend.direction === "up"
              ? "up"
              : trend.direction === "down"
                ? "down"
                : "flat"}{" "}
            {trend.magnitude.toFixed(1)} percent
          </span>
        </div>
      )}
    </div>
  );
}

export default AnimatedMetricCard;
