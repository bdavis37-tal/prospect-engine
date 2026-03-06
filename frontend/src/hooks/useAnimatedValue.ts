import { useState, useEffect, useRef, useCallback } from "react";

// ---------------------------------------------------------------------------
// Easing
// ---------------------------------------------------------------------------

/**
 * Ease-out exponential curve.
 * f(t) = 1 - 2^(-10t) for t in [0, 1]
 *
 * Produces fast initial movement that decelerates naturally — ideal for
 * count-up metric animations.
 */
function easeOutExpo(t: number): number {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Animates a numeric value from its current displayed value to a target using
 * `requestAnimationFrame` and an ease-out-expo curve.
 *
 * When `targetValue` changes the animation restarts from the *current*
 * displayed value so transitions are always smooth — even if the previous
 * animation hasn't finished yet.
 *
 * @param targetValue       The value to animate towards.
 * @param duration          Animation duration in milliseconds (default 600).
 * @param prefersReducedMotion  When `true` the target is returned immediately.
 * @returns The current interpolated display value.
 */
export function useAnimatedValue(
  targetValue: number,
  duration: number = 600,
  prefersReducedMotion: boolean = false,
): number {
  const [displayValue, setDisplayValue] = useState<number>(
    prefersReducedMotion ? targetValue : 0,
  );

  // Refs to track animation state across frames without triggering re-renders.
  const startValueRef = useRef<number>(prefersReducedMotion ? targetValue : 0);
  const endValueRef = useRef<number>(targetValue);
  const startTimeRef = useRef<number | null>(null);
  const rafIdRef = useRef<number>(0);
  const isFirstMount = useRef(true);

  // Keep a ref to the latest displayValue so we can read it synchronously
  // when the target changes mid-animation.
  const displayValueRef = useRef<number>(displayValue);
  displayValueRef.current = displayValue;

  const animate = useCallback(
    (time: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = time;
      }

      const elapsed = time - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutExpo(progress);

      const current =
        startValueRef.current +
        (endValueRef.current - startValueRef.current) * easedProgress;

      setDisplayValue(current);

      if (progress < 1) {
        rafIdRef.current = requestAnimationFrame(animate);
      }
    },
    [duration],
  );

  useEffect(() => {
    // Reduced motion — snap immediately, no animation.
    if (prefersReducedMotion) {
      cancelAnimationFrame(rafIdRef.current);
      setDisplayValue(targetValue);
      startValueRef.current = targetValue;
      endValueRef.current = targetValue;
      startTimeRef.current = null;
      return;
    }

    // On first mount animate from 0 → target.
    // On subsequent changes animate from current display → new target.
    if (isFirstMount.current) {
      isFirstMount.current = false;
      startValueRef.current = 0;
    } else {
      startValueRef.current = displayValueRef.current;
    }

    endValueRef.current = targetValue;
    startTimeRef.current = null;

    // Cancel any in-flight animation and start a new one.
    cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafIdRef.current);
    };
  }, [targetValue, prefersReducedMotion, animate]);

  // When reduced motion is active always return the target directly.
  if (prefersReducedMotion) {
    return targetValue;
  }

  return displayValue;
}
