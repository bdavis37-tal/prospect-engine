import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useUserPreferences } from "../../hooks/useUserPreferences";
import { decision as decisionTokens, springTransition } from "../../styles/tokens";
import type { DemoData, DemoProspect, ProspectResult, BinData } from "../../types/demo";
import type { CardDecisionType } from "../shared/ProspectCard";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ContextPanelProps {
  open: boolean;
  onToggle: () => void;
  prospectId: string | null;
  demoData: DemoData;
  activeScenario: string;
  onNavigateToProspect: (id: string) => void;
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

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/** Map backend decision_type (snake_case) to CardDecisionType (camelCase). */
function toCardDecision(dt: string): CardDecisionType {
  const map: Record<string, CardDecisionType> = {
    drill: "drill",
    farm_out: "farmOut",
    divest: "divest",
    defer: "defer",
  };
  return map[dt] ?? "defer";
}

function decisionLabel(dt: CardDecisionType): string {
  const labels: Record<CardDecisionType, string> = {
    drill: "Drill",
    farmOut: "Farm Out",
    divest: "Divest",
    defer: "Defer",
  };
  return labels[dt];
}

// ---------------------------------------------------------------------------
// Mini NPV Histogram Sparkline
// ---------------------------------------------------------------------------

function NpvHistogramSparkline({ bins }: { bins: BinData[] }) {
  if (!bins || bins.length === 0) return null;
  const maxFreq = Math.max(...bins.map((b) => b.frequency));
  if (maxFreq === 0) return null;

  const barWidth = 100 / bins.length;

  return (
    <div className="rounded-radius-sm bg-surface-base p-2">
      <p className="mb-1 text-xs font-medium text-text-secondary">NPV Distribution</p>
      <svg
        viewBox="0 0 100 32"
        className="h-8 w-full"
        preserveAspectRatio="none"
        aria-label="NPV histogram sparkline"
        role="img"
      >
        {bins.map((bin, i) => {
          const height = (bin.frequency / maxFreq) * 28;
          const isPositive = (bin.bin_start + bin.bin_end) / 2 >= 0;
          return (
            <rect
              key={i}
              x={i * barWidth}
              y={32 - height}
              width={Math.max(barWidth - 0.5, 0.5)}
              height={height}
              rx={0.5}
              fill={isPositive ? "#23D18B" : "#EF4444"}
              opacity={0.8}
            />
          );
        })}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Close Icon
// ---------------------------------------------------------------------------

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 5L5 15" />
      <path d="M5 5l10 10" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Prospect Not Found
// ---------------------------------------------------------------------------

function ProspectNotFound({
  prospects,
  onNavigate,
}: {
  prospects: DemoProspect[];
  onNavigate: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="rounded-radius-md border border-data-negative/30 bg-data-negative/10 p-3">
        <p className="text-sm font-medium text-data-negative">Prospect not found</p>
        <p className="mt-1 text-xs text-text-secondary">
          The selected prospect does not exist in the current dataset.
        </p>
      </div>
      <div>
        <p className="mb-2 text-xs font-medium text-text-secondary">Available prospects:</p>
        <ul className="flex flex-col gap-1">
          {prospects.map((p) => (
            <li key={p.prospect_id}>
              <button
                type="button"
                onClick={() => onNavigate(p.prospect_id)}
                className="w-full rounded-radius-sm px-2 py-1.5 text-left text-sm text-text-primary transition-colors hover:bg-surface-interactive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-border-focus"
              >
                {p.name}
                <span className="ml-2 text-xs text-text-tertiary">{p.basin}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Prospect Detail Content
// ---------------------------------------------------------------------------

function ProspectDetail({
  prospect,
  result,
}: {
  prospect: DemoProspect;
  result: ProspectResult;
}) {
  const recommendation = result.decision_comparison.recommendation;
  const cardDecision = toCardDecision(recommendation);
  const colors = decisionTokens[cardDecision];
  const sim = result.simulation;

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header: Name + Basin */}
      <div>
        <h3 className="text-base font-semibold text-text-primary">{prospect.name}</h3>
        <p className="text-xs text-text-secondary">
          {prospect.basin} · {prospect.hydrocarbon_type}
        </p>
      </div>

      {/* Decision Recommendation */}
      <div
        className="flex items-center gap-2 rounded-radius-sm px-3 py-2"
        style={{ backgroundColor: `${colors.muted}60` }}
      >
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: colors.base }}
          aria-hidden="true"
        />
        <span className="text-sm font-medium" style={{ color: colors.base }}>
          {decisionLabel(cardDecision)}
        </span>
        <span className="ml-auto text-xs text-text-secondary">Recommended</span>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-2">
        <MetricCell label="Expected NPV" value={formatCurrency(sim.expected_npv)} />
        <MetricCell label="P(NPV > 0)" value={formatPercent(sim.probability_positive_npv)} />
        <MetricCell label="P10" value={formatCurrency(sim.npv_distribution.p10)} />
        <MetricCell label="P50" value={formatCurrency(sim.npv_distribution.p50)} />
        <MetricCell label="P90" value={formatCurrency(sim.npv_distribution.p90)} />
        <MetricCell label="Capital at Risk" value={formatCurrency(sim.capital_at_risk)} />
      </div>

      {/* NPV Histogram Sparkline */}
      <NpvHistogramSparkline bins={sim.npv_histogram_data} />
    </div>
  );
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-radius-sm bg-surface-base px-3 py-2">
      <p className="text-[11px] text-text-tertiary">{label}</p>
      <p className="font-mono text-sm font-medium text-text-primary">{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Resize Handle
// ---------------------------------------------------------------------------

function ResizeHandle({
  onResize,
}: {
  onResize: (deltaX: number) => void;
}) {
  const dragging = useRef(false);
  const lastX = useRef(0);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragging.current = true;
      lastX.current = e.clientX;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      const delta = lastX.current - e.clientX; // negative = drag left = wider panel
      lastX.current = e.clientX;
      onResize(delta);
    },
    [onResize],
  );

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize context panel"
      className="absolute left-0 top-0 z-10 h-full w-1.5 cursor-col-resize select-none transition-colors hover:bg-surface-border-focus/40"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    />
  );
}

// ---------------------------------------------------------------------------
// ContextPanel Component
// ---------------------------------------------------------------------------

export function ContextPanel({
  open,
  onToggle,
  prospectId,
  demoData,
  activeScenario,
  onNavigateToProspect,
}: ContextPanelProps) {
  const { preferences, updatePreference } = useUserPreferences();
  const panelRef = useRef<HTMLElement>(null);
  const [panelWidth, setPanelWidth] = useState(preferences.contextPanelWidth);

  // Sync panelWidth from preferences on mount
  useEffect(() => {
    setPanelWidth(preferences.contextPanelWidth);
  }, [preferences.contextPanelWidth]);

  // Auto-close at viewport < 1024px
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth < 1024 && open) {
        onToggle();
      }
    }
    window.addEventListener("resize", handleResize);
    // Check on mount too
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Resolve prospect data
  const prospects = demoData.input.prospects;
  const prospectIds = useMemo(() => prospects.map((p) => p.prospect_id), [prospects]);

  const prospect = useMemo(
    () => (prospectId ? prospects.find((p) => p.prospect_id === prospectId) ?? null : null),
    [prospectId, prospects],
  );

  const result = useMemo(
    () =>
      prospectId
        ? demoData.results.prospect_results.find((r) => r.prospect_id === prospectId) ?? null
        : null,
    [prospectId, demoData.results.prospect_results],
  );

  const isValidProspect = prospect !== null && result !== null;
  const isInvalidId = prospectId !== null && !isValidProspect;

  // Arrow key navigation between prospects
  useEffect(() => {
    if (!open || !prospectId) return;

    function handleKeyDown(e: KeyboardEvent) {
      // Only handle when panel is focused
      if (!panelRef.current?.contains(document.activeElement) && document.activeElement !== panelRef.current) {
        return;
      }

      const currentIndex = prospectIds.indexOf(prospectId!);
      if (currentIndex === -1) return;

      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % prospectIds.length;
        onNavigateToProspect(prospectIds[nextIndex]);
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        const prevIndex = (currentIndex - 1 + prospectIds.length) % prospectIds.length;
        onNavigateToProspect(prospectIds[prevIndex]);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, prospectId, prospectIds, onNavigateToProspect]);

  // Resize handler — updates local state and persists to preferences
  const handleResize = useCallback(
    (deltaX: number) => {
      setPanelWidth((prev) => {
        const next = Math.min(480, Math.max(280, prev + deltaX));
        updatePreference("contextPanelWidth", next);
        return next;
      });
    },
    [updatePreference],
  );

  return (
    <AnimatePresence mode="wait">
      {open && (
        <motion.aside
          ref={panelRef}
          tabIndex={-1}
          role="complementary"
          aria-label={`Context panel${prospect ? `: ${prospect.name}` : ""}`}
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={springTransition}
          className="relative flex h-full flex-col overflow-hidden border-l border-surface-border-subtle bg-surface-raised"
          style={{ width: panelWidth }}
        >
          {/* Resize handle */}
          <ResizeHandle onResize={handleResize} />

          {/* Header */}
          <div className="flex items-center justify-between border-b border-surface-border-subtle px-4 py-3">
            <h2 className="text-sm font-semibold text-text-primary">
              Prospect Detail
            </h2>
            <button
              type="button"
              onClick={onToggle}
              aria-label="Close context panel"
              className="flex h-7 w-7 items-center justify-center rounded-radius-sm text-text-tertiary transition-colors hover:bg-surface-interactive hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-border-focus"
            >
              <CloseIcon />
            </button>
          </div>

          {/* Scenario indicator */}
          <div className="border-b border-surface-border-subtle px-4 py-2">
            <p className="text-[11px] text-text-tertiary">
              Scenario: <span className="text-text-secondary">{activeScenario}</span>
            </p>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {prospectId === null && (
              <div className="flex h-full items-center justify-center p-4">
                <p className="text-center text-sm text-text-tertiary">
                  Select a prospect to view details
                </p>
              </div>
            )}

            {isInvalidId && (
              <ProspectNotFound
                prospects={prospects}
                onNavigate={onNavigateToProspect}
              />
            )}

            {isValidProspect && (
              <ProspectDetail prospect={prospect} result={result} />
            )}
          </div>

          {/* Footer: navigation hint */}
          {isValidProspect && (
            <div className="border-t border-surface-border-subtle px-4 py-2">
              <p className="text-center text-[11px] text-text-tertiary">
                <kbd className="rounded bg-surface-interactive px-1 py-0.5 font-mono text-[10px]">↑</kbd>
                {" "}
                <kbd className="rounded bg-surface-interactive px-1 py-0.5 font-mono text-[10px]">↓</kbd>
                {" "}Navigate prospects
              </p>
            </div>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

export default ContextPanel;
