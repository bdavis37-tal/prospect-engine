import { useState, useCallback, useRef } from "react";
import type { UserPreferences, ViewId } from "../types/command-center";
import { VIEW_ORDER } from "../types/command-center";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = "prospect-engine:user-preferences";
const MIN_PANEL_WIDTH = 280;
const MAX_PANEL_WIDTH = 480;
const MAX_RECENT_COMMANDS = 10;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clampWidth(value: number): number {
  return Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, value));
}

function getReducedMotionDefault(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getDefaultPreferences(): UserPreferences {
  return {
    contextPanelWidth: 320,
    contextPanelOpen: true,
    preferredScenario: null,
    recentCommands: [],
    viewOrder: [...VIEW_ORDER],
    compactMode: false,
    animationsReduced: getReducedMotionDefault(),
  };
}

/** Returns true if localStorage is readable and writable. */
function isLocalStorageAvailable(): boolean {
  try {
    const testKey = "__ls_test__";
    localStorage.setItem(testKey, "1");
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate and sanitise a raw parsed object into a safe `UserPreferences`.
 * Any field that is missing or has the wrong type is replaced with its default.
 */
function sanitise(raw: unknown): UserPreferences {
  const defaults = getDefaultPreferences();

  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return defaults;
  }

  const obj = raw as Record<string, unknown>;

  // contextPanelWidth
  const width =
    typeof obj.contextPanelWidth === "number" && Number.isFinite(obj.contextPanelWidth)
      ? clampWidth(obj.contextPanelWidth)
      : defaults.contextPanelWidth;

  // contextPanelOpen
  const panelOpen =
    typeof obj.contextPanelOpen === "boolean"
      ? obj.contextPanelOpen
      : defaults.contextPanelOpen;

  // preferredScenario
  const scenario =
    obj.preferredScenario === null || typeof obj.preferredScenario === "string"
      ? obj.preferredScenario
      : defaults.preferredScenario;

  // recentCommands — must be string[], capped at 10
  const recentCommands = (
    Array.isArray(obj.recentCommands)
      ? (obj.recentCommands as unknown[]).filter((c): c is string => typeof c === "string")
      : defaults.recentCommands
  ).slice(0, MAX_RECENT_COMMANDS);

  // viewOrder — must be exactly the 5 ViewIds with no duplicates
  let viewOrder: ViewId[] = defaults.viewOrder;
  if (Array.isArray(obj.viewOrder)) {
    const candidate = obj.viewOrder as unknown[];
    const allValid =
      candidate.length === VIEW_ORDER.length &&
      VIEW_ORDER.every((v) => candidate.includes(v));
    if (allValid) {
      viewOrder = candidate as ViewId[];
    }
  }

  // compactMode
  const compactMode =
    typeof obj.compactMode === "boolean" ? obj.compactMode : defaults.compactMode;

  // animationsReduced
  const animationsReduced =
    typeof obj.animationsReduced === "boolean"
      ? obj.animationsReduced
      : defaults.animationsReduced;

  return {
    contextPanelWidth: width,
    contextPanelOpen: panelOpen,
    preferredScenario: scenario,
    recentCommands,
    viewOrder,
    compactMode,
    animationsReduced,
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useUserPreferences(): {
  preferences: UserPreferences;
  updatePreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
  resetPreferences: () => void;
} {
  const useLocalStorage = useRef(isLocalStorageAvailable()).current;

  // In-memory fallback when localStorage is unavailable
  const memoryStore = useRef<string | null>(null);

  function readRaw(): string | null {
    if (useLocalStorage) {
      try {
        return localStorage.getItem(STORAGE_KEY);
      } catch {
        return null;
      }
    }
    return memoryStore.current;
  }

  function writeRaw(value: string): void {
    if (useLocalStorage) {
      try {
        localStorage.setItem(STORAGE_KEY, value);
      } catch {
        // quota exceeded or other error — fall through to memory
        memoryStore.current = value;
      }
    } else {
      memoryStore.current = value;
    }
  }

  function loadPreferences(): UserPreferences {
    const raw = readRaw();
    if (raw === null) return getDefaultPreferences();
    try {
      return sanitise(JSON.parse(raw));
    } catch {
      return getDefaultPreferences();
    }
  }

  const [preferences, setPreferences] = useState<UserPreferences>(loadPreferences);

  const persist = useCallback(
    (next: UserPreferences) => {
      writeRaw(JSON.stringify(next));
      setPreferences(next);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const updatePreference = useCallback(
    <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
      setPreferences((prev) => {
        let sanitisedValue = value;

        // Clamp contextPanelWidth on write
        if (key === "contextPanelWidth") {
          sanitisedValue = clampWidth(value as number) as UserPreferences[K];
        }

        // Cap recentCommands at 10 (FIFO)
        if (key === "recentCommands" && Array.isArray(sanitisedValue)) {
          sanitisedValue = (sanitisedValue as string[]).slice(0, MAX_RECENT_COMMANDS) as UserPreferences[K];
        }

        const next: UserPreferences = { ...prev, [key]: sanitisedValue };
        writeRaw(JSON.stringify(next));
        return next;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const resetPreferences = useCallback(() => {
    const defaults = getDefaultPreferences();
    persist(defaults);
  }, [persist]);

  return { preferences, updatePreference, resetPreferences };
}
