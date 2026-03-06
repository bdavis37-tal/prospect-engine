import { motion } from "framer-motion";
import { useMemo } from "react";
import { decision as decisionTokens, elevation } from "../../styles/tokens";
import type { DemoProspect, ProspectResult, BinData } from "../../types/demo";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Decision type using camelCase keys matching DesignTokens decision palette */
export type CardDecisionType = "drill" | "farmOut" | "divest" | "defer";

export interface ProspectCardProps {
  prospect: DemoProspect;
  result: ProspectResult;
  decision: CardDecisionType;
  selected: boolean;
  compact?: boolean;
  onClick: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

function probabilityColor(p: number): string {
  if (p >= 0.7) return "#23D18B"; // positive
  if (p >= 0.4) return "#F59E0B"; // highlight / warning
  return "#EF4444"; // negative
}

// ---------------------------------------------------------------------------
// NPV Sparkline — tiny inline bar chart from histogram bins
// ---------------------------------------------------------------------------

function NpvSparkline({ bins }: { bins: BinData[] }) {
  if (!bins || bins.length === 0) return null;

  const maxFreq = Math.max(...bins.map((b) => b.frequency));
  if (maxFreq === 0) return null;

  const barWidth = 100 / bins.length;

  return (
    <svg
      viewBox="0 0 100 24"
      className="h-6 w-full"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {bins.map((bin, i) => {
        const height = (bin.frequency / maxFreq) * 22;
        const isPositive = (bin.bin_start + bin.bin_end) / 2 >= 0;
        return (
          <rect
            key={i}
            x={i * barWidth}
            y={24 - height}
            width={Math.max(barWidth - 0.5, 0.5)}
            height={height}
            rx={0.5}
            fill={isPositive ? "#23D18B" : "#EF4444"}
            opacity={0.7}
          />
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Probability Badge
// ---------------------------------------------------------------------------

function ProbabilityBadge({ probability }: { probability: number }) {
  const pct = Math.round(probability * 100);
  const bg = probabilityColor(probability);

  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: `${bg}22`, color: bg }}
    >
      {pct}%
    </span>
  );
}


// ---------------------------------------------------------------------------
// Motion variants
// ---------------------------------------------------------------------------

const cardVariants = {
  idle: {
    scale: 1,
    boxShadow: elevation.low,
  },
  hover: {
    scale: 1.015,
    boxShadow: elevation.medium,
  },
};

// ---------------------------------------------------------------------------
// ProspectCard Component
// ---------------------------------------------------------------------------

export function ProspectCard({
  prospect,
  result,
  decision,
  selected,
  compact = false,
  onClick,
}: ProspectCardProps) {
  const colors = decisionTokens[decision];
  const prob = result.simulation.probability_positive_npv;
  const expectedNpv = result.simulation.expected_npv;
  const histogramBins = result.simulation.npv_histogram_data;

  const glowShadow = useMemo(
    () => `0 0 16px ${colors.glow}40, ${elevation.medium}`,
    [colors.glow],
  );

  const handleClick = () => onClick(prospect.prospect_id);

  // ── Compact (list-item) layout ────────────────────────────────
  if (compact) {
    return (
      <motion.button
        type="button"
        onClick={handleClick}
        initial="idle"
        whileHover={{
          scale: 1.015,
          boxShadow: glowShadow,
        }}
        className={`
          relative flex w-full items-center gap-3 rounded-md border
          bg-surface-raised px-3 py-2 text-left transition-colors
          ${selected
            ? "border-border-focus ring-2 ring-border-focus/40"
            : "border-border-subtle hover:border-border-default"
          }
        `}
        style={{ cursor: "pointer" }}
        aria-pressed={selected}
        aria-label={`${prospect.name} — ${decision} — NPV ${formatCurrency(expectedNpv)}`}
      >
        {/* Decision accent bar */}
        <span
          className="absolute left-0 top-0 h-full w-1 rounded-l-md"
          style={{ backgroundColor: colors.base }}
          aria-hidden="true"
        />

        {/* Name */}
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary pl-2">
          {prospect.name}
        </span>

        {/* NPV sparkline (narrow) */}
        <span className="hidden w-16 sm:block">
          <NpvSparkline bins={histogramBins} />
        </span>

        {/* Expected NPV */}
        <span className="shrink-0 font-mono text-xs text-text-secondary">
          {formatCurrency(expectedNpv)}
        </span>

        {/* Probability badge */}
        <ProbabilityBadge probability={prob} />
      </motion.button>
    );
  }

  // ── Expanded (grid card) layout ───────────────────────────────
  return (
    <motion.button
      type="button"
      onClick={handleClick}
      variants={cardVariants}
      initial="idle"
      whileHover={{
        scale: 1.015,
        boxShadow: glowShadow,
      }}
      className={`
        relative flex flex-col gap-2 rounded-lg border
        bg-surface-raised p-4 text-left transition-colors
        ${selected
          ? "border-border-focus ring-2 ring-border-focus/40"
          : "border-border-subtle hover:border-border-default"
        }
      `}
      style={{ cursor: "pointer" }}
      aria-pressed={selected}
      aria-label={`${prospect.name} — ${decision} — NPV ${formatCurrency(expectedNpv)}`}
    >
      {/* Decision accent bar */}
      <span
        className="absolute left-0 top-0 h-full w-1.5 rounded-l-lg"
        style={{ backgroundColor: colors.base }}
        aria-hidden="true"
      />

      {/* Header row */}
      <div className="flex items-start justify-between gap-2 pl-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-text-primary">
            {prospect.name}
          </h3>
          <p className="text-xs text-text-tertiary">
            {prospect.basin} · {prospect.hydrocarbon_type}
          </p>
        </div>
        <ProbabilityBadge probability={prob} />
      </div>

      {/* NPV sparkline */}
      <div className="pl-2">
        <NpvSparkline bins={histogramBins} />
      </div>

      {/* Metrics row */}
      <div className="flex items-center gap-3 pl-2 text-xs">
        <span className="font-mono text-text-primary">
          {formatCurrency(expectedNpv)}
        </span>
        <span className="text-text-tertiary">
          P50: {formatCurrency(result.simulation.npv_distribution.p50)}
        </span>
      </div>
    </motion.button>
  );
}

export default ProspectCard;
