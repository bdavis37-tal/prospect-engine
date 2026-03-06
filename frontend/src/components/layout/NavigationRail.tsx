import { motion } from "framer-motion";
import * as Tooltip from "@radix-ui/react-tooltip";
import type { ViewId, NavItem } from "../../types/command-center";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface NavigationRailProps {
  activeView: ViewId;
  onNavigate: (view: ViewId) => void;
  prospectCount: number;
  hasAlerts: boolean;
}

// ---------------------------------------------------------------------------
// Inline SVG Icons
// ---------------------------------------------------------------------------

function MapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z" />
    </svg>
  );
}

function CubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="M3.27 6.96 12 12.01l8.73-5.05" />
      <path d="M12 22.08V12" />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M7 16l4-8 4 4 4-8" />
    </svg>
  );
}

function LayersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2 2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}

function FileTextIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
      <path d="M10 9H8" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Navigation Items
// ---------------------------------------------------------------------------

const NAV_ITEMS: NavItem[] = [
  { id: "map", label: "Map", icon: MapIcon, shortcut: "1" },
  { id: "subsurface", label: "Subsurface", icon: CubeIcon, shortcut: "2" },
  { id: "optimizer", label: "Optimizer", icon: ChartIcon, shortcut: "3" },
  { id: "scenarios", label: "Scenarios", icon: LayersIcon, shortcut: "4" },
  { id: "summary", label: "Summary", icon: FileTextIcon, shortcut: "5" },
];

// ---------------------------------------------------------------------------
// Badge Component
// ---------------------------------------------------------------------------

function Badge({ value }: { value: number | "dot" }) {
  if (value === "dot") {
    return (
      <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-data-negative ring-2 ring-surface-base" />
    );
  }
  return (
    <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-data-negative px-1 text-[10px] font-semibold text-text-primary ring-2 ring-surface-base">
      {value > 99 ? "99+" : value}
    </span>
  );
}

// ---------------------------------------------------------------------------
// NavigationRail Component
// ---------------------------------------------------------------------------

export function NavigationRail({
  activeView,
  onNavigate,
  prospectCount,
  hasAlerts,
}: NavigationRailProps) {
  /** Determine badge for a given nav item. */
  function getBadge(id: ViewId): NavItem["badge"] {
    if (id === "scenarios" && hasAlerts) return "dot";
    if (id === "map" && prospectCount > 0) return prospectCount;
    return undefined;
  }

  return (
    <Tooltip.Provider delayDuration={300}>
      <nav
        aria-label="Main navigation"
        className="flex h-full w-14 flex-col items-center gap-1 border-r border-surface-border-subtle bg-surface-raised py-4 md:w-16 md:gap-2"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeView === item.id;
          const badge = getBadge(item.id);
          const Icon = item.icon;

          return (
            <Tooltip.Root key={item.id}>
              <Tooltip.Trigger asChild>
                <button
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  aria-current={isActive ? "page" : undefined}
                  className="relative flex h-10 w-10 items-center justify-center rounded-radius-md transition-colors duration-animation-fast hover:bg-surface-interactive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-border-focus md:h-11 md:w-11"
                >
                  {/* Active indicator — slides between items */}
                  {isActive && (
                    <motion.div
                      layoutId="nav-active-indicator"
                      className="absolute inset-0 rounded-radius-md bg-surface-interactive"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}

                  {/* Icon */}
                  <Icon
                    className={`relative z-10 h-5 w-5 transition-colors duration-animation-fast ${
                      isActive ? "text-text-primary" : "text-text-tertiary"
                    }`}
                  />

                  {/* Badge */}
                  {badge != null && <Badge value={badge} />}
                </button>
              </Tooltip.Trigger>

              <Tooltip.Portal>
                <Tooltip.Content
                  side="right"
                  sideOffset={8}
                  className="z-50 rounded-radius-sm bg-surface-overlay px-3 py-1.5 text-caption text-text-primary shadow-elevation-medium"
                >
                  <span>{item.label}</span>
                  <kbd className="ml-2 rounded bg-surface-interactive px-1.5 py-0.5 font-mono text-[11px] text-text-secondary">
                    {item.shortcut}
                  </kbd>
                  <Tooltip.Arrow className="fill-surface-overlay" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          );
        })}
      </nav>
    </Tooltip.Provider>
  );
}

export default NavigationRail;
