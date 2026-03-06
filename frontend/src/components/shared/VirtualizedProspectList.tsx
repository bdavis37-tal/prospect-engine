import { useCallback, useEffect, useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ProspectCard } from "./ProspectCard";
import type { CardDecisionType } from "./ProspectCard";
import type { DemoProspect, ProspectResult } from "../../types/demo";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProspectListItem {
  prospect: DemoProspect;
  result: ProspectResult;
  decision: CardDecisionType;
}

export interface VirtualizedProspectListProps {
  items: ProspectListItem[];
  selectedProspectId: string | null;
  onSelect: (prospectId: string) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Virtualization kicks in above this threshold */
const VIRTUALIZATION_THRESHOLD = 20;

/** Estimated height (px) of a compact ProspectCard row */
const ROW_HEIGHT = 48;

// ---------------------------------------------------------------------------
// VirtualizedProspectList
// ---------------------------------------------------------------------------

export function VirtualizedProspectList({
  items,
  selectedProspectId,
  onSelect,
}: VirtualizedProspectListProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const prospectIds = useMemo(() => items.map((i) => i.prospect.prospect_id), [items]);

  // Keyboard arrow navigation
  useEffect(() => {
    if (!selectedProspectId || items.length === 0) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (
        !containerRef.current?.contains(document.activeElement) &&
        document.activeElement !== containerRef.current
      ) {
        return;
      }

      const currentIndex = prospectIds.indexOf(selectedProspectId!);
      if (currentIndex === -1) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = Math.min(currentIndex + 1, prospectIds.length - 1);
        onSelect(prospectIds[next]);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = Math.max(currentIndex - 1, 0);
        onSelect(prospectIds[prev]);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedProspectId, prospectIds, onSelect, items.length]);

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center p-4">
        <p className="text-sm text-text-tertiary">No prospects available</p>
      </div>
    );
  }

  // Below threshold — render normally without virtualization
  if (items.length <= VIRTUALIZATION_THRESHOLD) {
    return (
      <NormalList
        items={items}
        selectedProspectId={selectedProspectId}
        onSelect={onSelect}
        containerRef={containerRef}
      />
    );
  }

  // Above threshold — virtualized rendering
  return (
    <VirtualList
      items={items}
      selectedProspectId={selectedProspectId}
      onSelect={onSelect}
      containerRef={containerRef}
    />
  );
}

// ---------------------------------------------------------------------------
// Normal (non-virtualized) list
// ---------------------------------------------------------------------------

function NormalList({
  items,
  selectedProspectId,
  onSelect,
  containerRef,
}: {
  items: ProspectListItem[];
  selectedProspectId: string | null;
  onSelect: (id: string) => void;
  containerRef: React.RefObject<HTMLDivElement>;
}) {
  return (
    <div
      ref={containerRef as React.RefObject<HTMLDivElement>}
      tabIndex={-1}
      role="listbox"
      aria-label="Prospect list"
      className="flex flex-col gap-1 p-2"
    >
      {items.map((item) => (
        <div key={item.prospect.prospect_id} role="option" aria-selected={item.prospect.prospect_id === selectedProspectId}>
          <ProspectCard
            prospect={item.prospect}
            result={item.result}
            decision={item.decision}
            selected={item.prospect.prospect_id === selectedProspectId}
            compact
            onClick={onSelect}
          />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Virtualized list
// ---------------------------------------------------------------------------

function VirtualList({
  items,
  selectedProspectId,
  onSelect,
  containerRef,
}: {
  items: ProspectListItem[];
  selectedProspectId: string | null;
  onSelect: (id: string) => void;
  containerRef: React.RefObject<HTMLDivElement>;
}) {
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  });

  // Scroll selected item into view when selection changes
  const scrollToSelected = useCallback(() => {
    if (!selectedProspectId) return;
    const idx = items.findIndex((i) => i.prospect.prospect_id === selectedProspectId);
    if (idx >= 0) {
      virtualizer.scrollToIndex(idx, { align: "auto" });
    }
  }, [selectedProspectId, items, virtualizer]);

  useEffect(() => {
    scrollToSelected();
  }, [scrollToSelected]);

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      role="listbox"
      aria-label="Prospect list"
      className="flex-1 overflow-y-auto p-2"
    >
      <div
        className="relative w-full"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = items[virtualRow.index];
          const id = item.prospect.prospect_id;
          return (
            <div
              key={id}
              role="option"
              aria-selected={id === selectedProspectId}
              className="absolute left-0 top-0 w-full px-0 py-0.5"
              style={{
                height: virtualRow.size,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <ProspectCard
                prospect={item.prospect}
                result={item.result}
                decision={item.decision}
                selected={id === selectedProspectId}
                compact
                onClick={onSelect}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default VirtualizedProspectList;
