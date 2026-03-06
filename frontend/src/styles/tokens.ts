/**
 * Design tokens for use in JS/D3/framer-motion contexts.
 * Values match the Tailwind config in tailwind.config.ts exactly.
 */

// ── Color Tokens ──────────────────────────────────────────────

export const surface = {
  base: "#06090E",
  raised: "#0C1219",
  overlay: "#121C28",
  interactive: "#1A2535",
  border: {
    subtle: "#1E2A3A",
    default: "#2A3A4E",
    focus: "#3B82F6",
  },
} as const;

export const decision = {
  drill: { base: "#23D18B", glow: "#34EFA0", muted: "#1A5C3F" },
  farmOut: { base: "#2FA7FF", glow: "#5BBDFF", muted: "#1A3F5C" },
  divest: { base: "#F97316", glow: "#FB923C", muted: "#5C3A1A" },
  defer: { base: "#94A3B8", glow: "#B0BEC5", muted: "#3A4555" },
} as const;

export const data = {
  positive: "#23D18B",
  negative: "#EF4444",
  neutral: "#94A3B8",
  highlight: "#F59E0B",
  info: "#3B82F6",
} as const;

export const text = {
  primary: "#F1F5F9",
  secondary: "#94A3B8",
  tertiary: "#64748B",
  inverse: "#0F172A",
} as const;

// ── Typography Tokens ─────────────────────────────────────────

export const typography = {
  display: { size: "3rem", weight: 700, tracking: "-0.02em" },
  heading: { size: "1.5rem", weight: 600, tracking: "-0.01em" },
  subheading: { size: "1.125rem", weight: 500, tracking: "-0.005em" },
  body: { size: "0.9375rem", weight: 400, lineHeight: "1.6" },
  caption: { size: "0.8125rem", weight: 400, lineHeight: "1.5" },
  mono: { size: "0.875rem", weight: 400, fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace" },
} as const;

// ── Spacing Tokens ────────────────────────────────────────────

/** 4px base unit */
export const spacingUnit = 4;

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
} as const;

// ── Animation Tokens ──────────────────────────────────────────

export const animation = {
  /** 150ms — micro-interactions */
  fast: "150ms",
  /** 250ms — panel transitions */
  normal: "250ms",
  /** 400ms — page transitions */
  slow: "400ms",
  /** cubic-bezier(0.34, 1.56, 0.64, 1) */
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  /** cubic-bezier(0.4, 0, 0.2, 1) */
  ease: "cubic-bezier(0.4, 0, 0.2, 1)",
} as const;

/** Numeric durations in seconds for framer-motion */
export const durations = {
  fast: 0.15,
  normal: 0.25,
  slow: 0.4,
} as const;

/** Spring config for framer-motion's spring transition */
export const springTransition = {
  type: "spring" as const,
  stiffness: 300,
  damping: 20,
};

/** Ease array for framer-motion's tween transition */
export const easeCurve = [0.4, 0, 0.2, 1] as const;

// ── Border Radius Tokens ──────────────────────────────────────

export const radius = {
  sm: "6px",
  md: "10px",
  lg: "16px",
  full: "9999px",
} as const;

// ── Elevation Tokens ──────────────────────────────────────────

export const elevation = {
  low: "0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)",
  medium: "0 4px 12px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.3)",
  high: "0 12px 32px rgba(0, 0, 0, 0.5), 0 4px 8px rgba(0, 0, 0, 0.4)",
} as const;

// ── Aggregate DesignTokens Type & Object ──────────────────────

export interface DesignTokens {
  colors: {
    surface: typeof surface;
    decision: typeof decision;
    data: typeof data;
    text: typeof text;
  };
  spacing: typeof spacing;
  typography: typeof typography;
  elevation: typeof elevation;
  animation: typeof animation;
  radius: typeof radius;
}

export const designTokens: DesignTokens = {
  colors: { surface, decision, data, text },
  spacing,
  typography,
  elevation,
  animation,
  radius,
};
