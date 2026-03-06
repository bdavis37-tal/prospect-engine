import { useEffect } from "react";

// ---------------------------------------------------------------------------
// Browser default shortcuts that must never be intercepted
// ---------------------------------------------------------------------------

const BROWSER_DEFAULTS = new Set(["c", "v", "z", "a"]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns true when the currently focused element is a text-entry context
 * (input, textarea, or contenteditable) where keyboard shortcuts should be
 * suppressed to avoid interfering with typing.
 */
function isFocusInsideTextEntry(): boolean {
  const el = document.activeElement;
  if (!el) return false;

  const tag = el.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea") return true;
  if ((el as HTMLElement).isContentEditable) return true;

  return false;
}

/**
 * Returns true when the event includes a platform meta modifier (Cmd on macOS,
 * Ctrl elsewhere) — used to detect browser-default combos like Cmd+C.
 */
function hasMetaModifier(e: KeyboardEvent): boolean {
  return e.metaKey || e.ctrlKey;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Registers global keyboard event listeners for the provided shortcut map.
 *
 * - Shortcuts are suppressed when focus is inside an `<input>`, `<textarea>`,
 *   or `[contenteditable]` element (Requirement 13.1).
 * - Browser defaults (Cmd/Ctrl + C, V, Z, A) are never overridden (Req 13.2).
 * - Listeners are cleaned up when `enabled` becomes false or on unmount (Req 13.3).
 *
 * @param shortcuts - Map of keyboard event `key` values to handler functions.
 * @param enabled   - When false, all listeners are removed.
 */
export function useKeyboardShortcuts(
  shortcuts: Record<string, () => void>,
  enabled: boolean,
): void {
  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      // Never intercept browser-default combos (Cmd/Ctrl + C/V/Z/A)
      if (hasMetaModifier(e) && BROWSER_DEFAULTS.has(e.key.toLowerCase())) {
        return;
      }

      // Suppress shortcuts while the user is typing in a text field
      if (isFocusInsideTextEntry()) return;

      const handler = shortcuts[e.key];
      if (handler) {
        handler();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [shortcuts, enabled]);
}
