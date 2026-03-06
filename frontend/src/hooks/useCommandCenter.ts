import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import type { DemoData } from "../types/demo";
import type {
  ViewId,
  CommandCenterState,
  CommandAction,
  ViewTransitionState,
} from "../types/command-center";
import { VIEW_ORDER } from "../types/command-center";
import { useViewTransition } from "./useViewTransition";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export interface UseCommandCenterReturn {
  activeView: ViewId;
  transition: ViewTransitionState;
  isTransitioning: boolean;
  contextPanel: {
    open: boolean;
    content: "prospect-detail" | "quick-compare" | "filters" | null;
    prospectId: string | null;
  };
  commandBarOpen: boolean;
  activeScenario: string;
  navigate: (view: ViewId) => void;
  toggleCommandBar: () => void;
  openContextPanel: (prospectId: string) => void;
  closeContextPanel: () => void;
  setActiveScenario: (scenario: string) => void;
  handleCommandAction: (action: CommandAction) => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Central state-management hook for the CommandCenter layout.
 *
 * Manages active view, context panel, command bar, and scenario state.
 * Wires keyboard shortcuts (1-5 for views, Cmd/Ctrl+K for command bar)
 * and queues navigation requests that arrive during active transitions.
 *
 * @param demoData - The fully-loaded demo dataset.
 */
export function useCommandCenter(demoData: DemoData): UseCommandCenterReturn {
  // -----------------------------------------------------------------------
  // View transition (delegates to useViewTransition)
  // -----------------------------------------------------------------------
  const { transition, navigate: rawNavigate, isTransitioning } =
    useViewTransition();

  const activeView: ViewId = transition.to;

  // -----------------------------------------------------------------------
  // Queued navigation — stores the latest request made during a transition
  // -----------------------------------------------------------------------
  const queuedViewRef = useRef<ViewId | null>(null);

  const navigate = useCallback(
    (view: ViewId) => {
      if (isTransitioning) {
        // Queue the latest request; discard any intermediate ones
        queuedViewRef.current = view;
        return;
      }
      rawNavigate(view);
    },
    [isTransitioning, rawNavigate],
  );

  // Flush the queued navigation once the current transition settles
  useEffect(() => {
    if (!isTransitioning && queuedViewRef.current !== null) {
      const queued = queuedViewRef.current;
      queuedViewRef.current = null;
      rawNavigate(queued);
    }
  }, [isTransitioning, rawNavigate]);

  // -----------------------------------------------------------------------
  // Context panel state
  // -----------------------------------------------------------------------
  const [contextPanel, setContextPanel] = useState<
    CommandCenterState["contextPanel"]
  >({
    open: false,
    content: null,
    prospectId: null,
  });

  const openContextPanel = useCallback(
    (prospectId: string) => {
      // Only open for prospect IDs that exist in the dataset
      const exists = demoData.input.prospects.some(
        (p) => p.prospect_id === prospectId,
      );
      if (!exists) return;

      setContextPanel({
        open: true,
        content: "prospect-detail",
        prospectId,
      });
    },
    [demoData],
  );

  const closeContextPanel = useCallback(() => {
    setContextPanel({ open: false, content: null, prospectId: null });
  }, []);

  // -----------------------------------------------------------------------
  // Command bar state
  // -----------------------------------------------------------------------
  const [commandBarOpen, setCommandBarOpen] = useState(false);

  const toggleCommandBar = useCallback(() => {
    setCommandBarOpen((prev) => !prev);
  }, []);

  // -----------------------------------------------------------------------
  // Active scenario
  // -----------------------------------------------------------------------
  const defaultScenario =
    demoData.results.scenario_comparison.scenario_results[0]?.scenario_name ??
    demoData.results.scenario_name;

  const [activeScenario, setActiveScenario] = useState(defaultScenario);

  // -----------------------------------------------------------------------
  // Command action handler
  // -----------------------------------------------------------------------
  const handleCommandAction = useCallback(
    (action: CommandAction) => {
      switch (action.type) {
        case "navigate":
          navigate(action.view);
          break;
        case "select-prospect":
          openContextPanel(action.prospectId);
          break;
        case "switch-scenario":
          setActiveScenario(action.scenario);
          break;
        case "toggle-panel":
          if (action.panel === "context") {
            setContextPanel((prev) =>
              prev.open
                ? { open: false, content: null, prospectId: null }
                : { ...prev, open: true },
            );
          }
          break;
        case "export":
          // Export handling is delegated to the consuming component
          break;
      }
    },
    [navigate, openContextPanel],
  );

  // -----------------------------------------------------------------------
  // Keyboard shortcuts
  // -----------------------------------------------------------------------

  // Cmd/Ctrl+K handler — registered as a separate global listener so it
  // works even when the command bar is open (to toggle it closed).
  useEffect(() => {
    function handleCmdK(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggleCommandBar();
      }
    }
    window.addEventListener("keydown", handleCmdK);
    return () => window.removeEventListener("keydown", handleCmdK);
  }, [toggleCommandBar]);

  // Number-key shortcuts (1-5) for view navigation — disabled when the
  // command bar is open so typing numbers in the search field works.
  const shortcuts = useMemo(
    () => ({
      "1": () => navigate(VIEW_ORDER[0]),
      "2": () => navigate(VIEW_ORDER[1]),
      "3": () => navigate(VIEW_ORDER[2]),
      "4": () => navigate(VIEW_ORDER[3]),
      "5": () => navigate(VIEW_ORDER[4]),
    }),
    [navigate],
  );

  useKeyboardShortcuts(shortcuts, !commandBarOpen);

  // -----------------------------------------------------------------------
  // Return
  // -----------------------------------------------------------------------
  return {
    activeView,
    transition,
    isTransitioning,
    contextPanel,
    commandBarOpen,
    activeScenario,
    navigate,
    toggleCommandBar,
    openContextPanel,
    closeContextPanel,
    setActiveScenario,
    handleCommandAction,
  };
}
