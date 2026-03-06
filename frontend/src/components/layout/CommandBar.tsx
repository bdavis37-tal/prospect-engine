import { useCallback, useEffect, useMemo, useState } from "react";
import { Command } from "cmdk";
import { AnimatePresence, motion } from "framer-motion";
import { searchCommands } from "../../lib/commandSearch";
import { durations } from "../../styles/tokens";
import type { DemoData } from "../../types/demo";
import type { CommandAction, CommandItem, ViewId } from "../../types/command-center";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CommandBarProps {
  open: boolean;
  onClose: () => void;
  demoData: DemoData;
  onAction: (action: CommandAction) => void;
}

// ---------------------------------------------------------------------------
// Inline SVG Icons
// ---------------------------------------------------------------------------

function MapIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z" />
    </svg>
  );
}

function CubeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="M3.27 6.96 12 12.01l8.73-5.05" />
      <path d="M12 22.08V12" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M7 16l4-8 4 4 4-8" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2 2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}

function FileTextIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
      <path d="M10 9H8" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function BeakerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 3h15" />
      <path d="M6 3v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3" />
      <path d="M6 14h12" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function PanelIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M15 3v18" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Navigation icon map
// ---------------------------------------------------------------------------

const VIEW_ICONS: Record<ViewId, React.ComponentType> = {
  map: MapIcon,
  subsurface: CubeIcon,
  optimizer: ChartIcon,
  scenarios: LayersIcon,
  summary: FileTextIcon,
};

const VIEW_LABELS: Record<ViewId, string> = {
  map: "Map",
  subsurface: "Subsurface",
  optimizer: "Optimizer",
  scenarios: "Scenarios",
  summary: "Summary",
};

const VIEW_SHORTCUTS: Record<ViewId, string> = {
  map: "1",
  subsurface: "2",
  optimizer: "3",
  scenarios: "4",
  summary: "5",
};

// ---------------------------------------------------------------------------
// Build command items from demo data
// ---------------------------------------------------------------------------

function buildCommandItems(demoData: DemoData): CommandItem[] {
  const items: CommandItem[] = [];

  // 1. Navigation items (5 views)
  const viewIds: ViewId[] = ["map", "subsurface", "optimizer", "scenarios", "summary"];
  for (const viewId of viewIds) {
    items.push({
      id: `nav-${viewId}`,
      label: `Go to ${VIEW_LABELS[viewId]}`,
      category: "Navigation",
      icon: VIEW_ICONS[viewId],
      shortcut: VIEW_SHORTCUTS[viewId],
      action: { type: "navigate", view: viewId },
    });
  }

  // 2. Prospect items (from demoData.input.prospects)
  for (const prospect of demoData.input.prospects) {
    items.push({
      id: `prospect-${prospect.prospect_id}`,
      label: prospect.name,
      category: "Prospects",
      icon: UserIcon,
      action: { type: "select-prospect", prospectId: prospect.prospect_id },
    });
  }

  // 3. Scenario items (from demoData.results.scenario_comparison.scenario_results)
  for (const scenario of demoData.results.scenario_comparison.scenario_results) {
    items.push({
      id: `scenario-${scenario.scenario_name}`,
      label: `Switch to ${scenario.scenario_name}`,
      category: "Scenarios",
      icon: BeakerIcon,
      action: { type: "switch-scenario", scenario: scenario.scenario_name },
    });
  }

  // 4. Action items
  items.push(
    {
      id: "action-export-csv",
      label: "Export CSV",
      category: "Actions",
      icon: DownloadIcon,
      action: { type: "export", format: "csv" },
    },
    {
      id: "action-export-pdf",
      label: "Export PDF",
      category: "Actions",
      icon: DownloadIcon,
      action: { type: "export", format: "pdf" },
    },
    {
      id: "action-toggle-context",
      label: "Toggle Context Panel",
      category: "Actions",
      icon: PanelIcon,
      action: { type: "toggle-panel", panel: "context" },
    },
  );

  return items;
}

// ---------------------------------------------------------------------------
// Category ordering for grouped display
// ---------------------------------------------------------------------------

const CATEGORY_ORDER: CommandItem["category"][] = [
  "Navigation",
  "Prospects",
  "Scenarios",
  "Actions",
];

function groupByCategory(items: CommandItem[]): Map<CommandItem["category"], CommandItem[]> {
  const groups = new Map<CommandItem["category"], CommandItem[]>();
  for (const cat of CATEGORY_ORDER) {
    groups.set(cat, []);
  }
  for (const item of items) {
    const list = groups.get(item.category);
    if (list) {
      list.push(item);
    }
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Framer-motion variants
// ---------------------------------------------------------------------------

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const dialogVariants = {
  hidden: { opacity: 0, scale: 0.96, y: -8 },
  visible: { opacity: 1, scale: 1, y: 0 },
};

// ---------------------------------------------------------------------------
// CommandBar Component
// ---------------------------------------------------------------------------

export function CommandBar({ open, onClose, demoData, onAction }: CommandBarProps) {
  const [search, setSearch] = useState("");

  // Build all command items from demo data
  const allItems = useMemo(() => buildCommandItems(demoData), [demoData]);

  // Use our custom fuzzy search (shouldFilter=false on cmdk, we handle filtering)
  const filteredItems = useMemo(
    () => searchCommands(search, allItems, []),
    [search, allItems],
  );

  const grouped = useMemo(() => groupByCategory(filteredItems), [filteredItems]);

  // Handle item selection
  const handleSelect = useCallback(
    (itemId: string) => {
      const item = allItems.find((i) => i.id === itemId);
      if (item) {
        onAction(item.action);
        onClose();
      }
    },
    [allItems, onAction, onClose],
  );

  // Close on Escape
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Reset search when opening
  useEffect(() => {
    if (open) {
      setSearch("");
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
          {/* Backdrop with blur */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: durations.fast, ease: [0.4, 0, 0.2, 1] }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Dialog */}
          <motion.div
            className="relative z-10 w-full max-w-lg"
            variants={dialogVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: durations.normal, ease: [0.4, 0, 0.2, 1] }}
          >
            <Command
              label="Command palette"
              shouldFilter={false}
              loop
              className="overflow-hidden rounded-radius-lg border border-surface-border-subtle bg-surface-overlay shadow-elevation-high"
            >
              {/* Search input */}
              <div className="flex items-center gap-2 border-b border-surface-border-subtle px-4">
                <span className="text-text-tertiary">
                  <SearchIcon />
                </span>
                <Command.Input
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Type a command or search…"
                  className="h-12 flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
                />
                <kbd className="hidden rounded-radius-sm bg-surface-interactive px-1.5 py-0.5 font-mono text-[11px] text-text-tertiary sm:inline-block">
                  ESC
                </kbd>
              </div>

              {/* Results list */}
              <Command.List className="max-h-80 overflow-y-auto p-2">
                <Command.Empty className="px-4 py-8 text-center text-sm text-text-tertiary">
                  No results found.
                </Command.Empty>

                {CATEGORY_ORDER.map((category) => {
                  const items = grouped.get(category);
                  if (!items || items.length === 0) return null;

                  return (
                    <Command.Group
                      key={category}
                      heading={category}
                      className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-text-tertiary"
                    >
                      {items.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Command.Item
                            key={item.id}
                            value={item.id}
                            onSelect={handleSelect}
                            className="flex cursor-pointer items-center gap-3 rounded-radius-md px-3 py-2.5 text-sm text-text-secondary transition-colors data-[selected=true]:bg-surface-interactive data-[selected=true]:text-text-primary"
                          >
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center text-text-tertiary">
                              <Icon />
                            </span>
                            <span className="flex-1 truncate">{item.label}</span>
                            {item.shortcut && (
                              <kbd className="ml-auto rounded-radius-sm bg-surface-base px-1.5 py-0.5 font-mono text-[11px] text-text-tertiary">
                                {item.shortcut}
                              </kbd>
                            )}
                          </Command.Item>
                        );
                      })}
                    </Command.Group>
                  );
                })}
              </Command.List>

              {/* Footer hint */}
              <div className="flex items-center gap-4 border-t border-surface-border-subtle px-4 py-2">
                <span className="flex items-center gap-1 text-[11px] text-text-tertiary">
                  <kbd className="rounded bg-surface-interactive px-1 py-0.5 font-mono text-[10px]">↑↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1 text-[11px] text-text-tertiary">
                  <kbd className="rounded bg-surface-interactive px-1 py-0.5 font-mono text-[10px]">↵</kbd>
                  Select
                </span>
                <span className="flex items-center gap-1 text-[11px] text-text-tertiary">
                  <kbd className="rounded bg-surface-interactive px-1 py-0.5 font-mono text-[10px]">esc</kbd>
                  Close
                </span>
              </div>
            </Command>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default CommandBar;
