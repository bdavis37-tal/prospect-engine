import { useState, useCallback, useRef } from "react";
import type { ViewId, ViewTransitionState } from "../types/command-center";
import { VIEW_ORDER } from "../types/command-center";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Check if the user prefers reduced motion via media query. */
function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Determine direction based on index positions in VIEW_ORDER. */
function getDirection(
  from: ViewId,
  to: ViewId,
): "forward" | "backward" {
  const fromIndex = VIEW_ORDER.indexOf(from);
  const toIndex = VIEW_ORDER.indexOf(to);
  return toIndex > fromIndex ? "forward" : "backward";
}

// ---------------------------------------------------------------------------
// Timing constants (ms)
// ---------------------------------------------------------------------------

const EXIT_DURATION = 150;
const ENTER_DURATION = 200;

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const INITIAL_TRANSITION: ViewTransitionState = {
  from: null,
  to: VIEW_ORDER[0],
  phase: "idle",
  direction: "forward",
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Manages animated view transitions in the CommandCenter.
 *
 * State machine: idle → exit → enter → idle
 * - Concurrent transitions are prevented (navigate is a no-op while transitioning).
 * - When `prefers-reduced-motion` is enabled the view switches instantly.
 * - Direction (forward / backward) is derived from VIEW_ORDER index positions.
 */
export function useViewTransition(): {
  transition: ViewTransitionState;
  navigate: (to: ViewId) => void;
  isTransitioning: boolean;
} {
  const [transition, setTransition] =
    useState<ViewTransitionState>(INITIAL_TRANSITION);

  // Track transitioning state in a ref so the navigate callback always sees
  // the latest value without needing to be re-created on every render.
  const isTransitioningRef = useRef(false);

  // Keep timer ids so we can clean up if the component unmounts mid-transition
  // (not strictly required by the spec but good hygiene).
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const navigate = useCallback((to: ViewId) => {
    // No-op when already transitioning or navigating to the current view.
    if (isTransitioningRef.current) return;

    setTransition((prev) => {
      const currentView = prev.to; // `to` always holds the active view
      if (currentView === to) return prev;

      const direction = getDirection(currentView, to);

      // ---------------------------------------------------------------
      // Reduced motion → instant switch
      // ---------------------------------------------------------------
      if (prefersReducedMotion()) {
        return { from: null, to, phase: "idle", direction };
      }

      // ---------------------------------------------------------------
      // Animated transition: exit → enter → idle
      // ---------------------------------------------------------------
      isTransitioningRef.current = true;

      // Phase 1: exit
      const exitTimer = setTimeout(() => {
        // Phase 2: enter (activeView changes here)
        setTransition({ from: currentView, to, phase: "enter", direction });

        const enterTimer = setTimeout(() => {
          // Phase 3: settle to idle
          setTransition({ from: null, to, phase: "idle", direction });
          isTransitioningRef.current = false;
        }, ENTER_DURATION);

        timersRef.current.push(enterTimer);
      }, EXIT_DURATION);

      timersRef.current.push(exitTimer);

      return { from: currentView, to, phase: "exit", direction };
    });
  }, []);

  const isTransitioning = transition.phase !== "idle";

  return { transition, navigate, isTransitioning };
}
