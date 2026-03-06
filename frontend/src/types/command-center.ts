import type { PortfolioState } from "./portfolio";

// ---------------------------------------------------------------------------
// View & Navigation
// ---------------------------------------------------------------------------

/** The five main views in the CommandCenter, ordered by NavigationRail position. */
export type ViewId = "map" | "subsurface" | "optimizer" | "scenarios" | "summary";

/** Canonical ordering used to determine transition direction. */
export const VIEW_ORDER: ViewId[] = [
  "map",
  "subsurface",
  "optimizer",
  "scenarios",
  "summary",
];

/** Describes the phase and direction of a view-to-view transition. */
export interface ViewTransitionState {
  /** The view being transitioned away from (`null` on initial render). */
  from: ViewId | null;
  /** The target view. */
  to: ViewId;
  /** Current phase of the transition state machine: idle → exit → enter → idle. */
  phase: "idle" | "exit" | "enter";
  /** Direction based on NavigationRail index positions. */
  direction: "forward" | "backward";
}

/** A single item rendered in the NavigationRail. */
export interface NavItem {
  id: ViewId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut: string;
  badge?: number | "dot";
}

// ---------------------------------------------------------------------------
// Command Center State
// ---------------------------------------------------------------------------

/** Top-level state managed by the CommandCenter layout. */
export interface CommandCenterState {
  activeView: ViewId;
  contextPanel: {
    open: boolean;
    content: "prospect-detail" | "quick-compare" | "filters" | null;
    prospectId: string | null;
  };
  activeScenario: string;
  commandBarOpen: boolean;
  viewTransition: ViewTransitionState;
}

// ---------------------------------------------------------------------------
// Command Bar
// ---------------------------------------------------------------------------

/** Discriminated union of actions executable from the CommandBar. */
export type CommandAction =
  | { type: "navigate"; view: ViewId }
  | { type: "select-prospect"; prospectId: string }
  | { type: "switch-scenario"; scenario: string }
  | { type: "export"; format: "csv" | "pdf" }
  | { type: "toggle-panel"; panel: "context" | "filters" };

/** A single searchable/selectable item in the CommandBar. */
export interface CommandItem {
  id: string;
  label: string;
  category: "Navigation" | "Prospects" | "Scenarios" | "Actions";
  icon: React.ComponentType;
  shortcut?: string;
  action: CommandAction;
}

// ---------------------------------------------------------------------------
// User Preferences (persisted to localStorage)
// ---------------------------------------------------------------------------

/**
 * User layout and display preferences persisted across sessions.
 *
 * **Constraints**
 * - `contextPanelWidth` — clamped to the range **[280, 480]** on every read
 *   and write. Values outside this range are silently clamped.
 * - `contextPanelOpen` — boolean; defaults to `true`.
 * - `preferredScenario` — `null` means "use dataset default".
 * - `recentCommands` — FIFO list of command IDs; **max length 10**. Oldest
 *   entries are evicted when the limit is exceeded.
 * - `viewOrder` — custom NavigationRail ordering. Must contain exactly the
 *   five `ViewId` values with no duplicates.
 * - `compactMode` — when `true`, prospect lists use a condensed layout.
 * - `animationsReduced` — initialised from the system
 *   `prefers-reduced-motion` media query on first load. Can be toggled
 *   manually by the user afterward.
 */
export interface UserPreferences {
  /** Width of the ContextPanel in pixels. Clamped to [280, 480]. */
  contextPanelWidth: number;
  contextPanelOpen: boolean;
  preferredScenario: string | null;
  /** Last 10 command-bar action IDs (FIFO). */
  recentCommands: string[];
  /** Custom NavigationRail ordering (all five ViewIds, no duplicates). */
  viewOrder: ViewId[];
  compactMode: boolean;
  /** Respects `prefers-reduced-motion`; can be overridden by user. */
  animationsReduced: boolean;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Result returned by step validation in the StepWizard. */
export interface ValidationResult {
  /** `true` if and only if `errors` is empty. */
  valid: boolean;
  errors: { field: string; message: string }[];
  warnings: { field: string; message: string }[];
}

// ---------------------------------------------------------------------------
// Step Wizard
// ---------------------------------------------------------------------------

/** Configuration for a single wizard step. */
export interface StepConfig {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType;
  validate: (state: PortfolioState) => ValidationResult;
}

// ---------------------------------------------------------------------------
// Enhanced Portfolio State
// ---------------------------------------------------------------------------

/** Extended portfolio state used by the StepWizard for progress tracking. */
export interface EnhancedPortfolioState extends PortfolioState {
  /** Set of step indices the user has successfully completed. */
  completedSteps: Set<number>;
  /** Index of the step currently displayed (0-4). */
  currentStep: number;
  /** Validation results keyed by step index. */
  stepValidation: Record<number, ValidationResult>;
  /** `true` when form state has changed since the last preview render. */
  previewDirty: boolean;
  /** Timestamp (ms) of the most recent preview update. */
  lastPreviewUpdate: number;
}
