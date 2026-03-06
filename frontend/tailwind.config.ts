import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Legacy aliases (preserved for backward compatibility)
        bg: "#0B1017",
        panel: "#121A25",
        drill: "#23D18B",
        farm: "#2FA7FF",
        divest: "#F97316",
        defer: "#94A3B8",

        // Semantic surface hierarchy
        surface: {
          base: "#06090E",
          raised: "#0C1219",
          overlay: "#121C28",
          interactive: "#1A2535",
        },
        border: {
          subtle: "#1E2A3A",
          DEFAULT: "#2A3A4E",
          focus: "#3B82F6",
        },

        // Decision palette with base/glow/muted variants
        decision: {
          drill: {
            base: "#23D18B",
            glow: "#34EFA0",
            muted: "#1A5C3F",
          },
          farmOut: {
            base: "#2FA7FF",
            glow: "#5BBDFF",
            muted: "#1A3F5C",
          },
          divest: {
            base: "#F97316",
            glow: "#FB923C",
            muted: "#5C3A1A",
          },
          defer: {
            base: "#94A3B8",
            glow: "#B0BEC5",
            muted: "#3A4555",
          },
        },

        // Semantic data colors
        data: {
          positive: "#23D18B",
          negative: "#EF4444",
          neutral: "#94A3B8",
          highlight: "#F59E0B",
          info: "#3B82F6",
        },

        // Text hierarchy
        text: {
          primary: "#F1F5F9",
          secondary: "#94A3B8",
          tertiary: "#64748B",
          inverse: "#0F172A",
        },
      },

      // Typography scale
      fontSize: {
        display: ["3rem", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "700" }],
        heading: ["1.5rem", { lineHeight: "1.2", letterSpacing: "-0.01em", fontWeight: "600" }],
        subheading: ["1.125rem", { lineHeight: "1.3", letterSpacing: "-0.005em", fontWeight: "500" }],
        body: ["0.9375rem", { lineHeight: "1.6", fontWeight: "400" }],
        caption: ["0.8125rem", { lineHeight: "1.5", fontWeight: "400" }],
        mono: ["0.875rem", { lineHeight: "1.5", fontWeight: "400" }],
      },

      fontFamily: {
        mono: ["'JetBrains Mono'", "ui-monospace", "SFMono-Regular", "monospace"],
      },

      // Spacing scale based on 4px unit
      spacing: {
        "0": "0px",
        "1": "4px",
        "2": "8px",
        "3": "12px",
        "4": "16px",
        "5": "20px",
        "6": "24px",
        "8": "32px",
        "10": "40px",
        "12": "48px",
        "16": "64px",
        "20": "80px",
        "24": "96px",
      },

      // Animation timing tokens
      transitionDuration: {
        fast: "150ms",
        normal: "250ms",
        slow: "400ms",
      },

      transitionTimingFunction: {
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        ease: "cubic-bezier(0.4, 0, 0.2, 1)",
      },

      // Border radius tokens
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "16px",
        full: "9999px",
      },

      // Elevation shadow tokens
      boxShadow: {
        low: "0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)",
        medium: "0 4px 12px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.3)",
        high: "0 12px 32px rgba(0, 0, 0, 0.5), 0 4px 8px rgba(0, 0, 0, 0.4)",
      },
    },
  },
  plugins: [],
} satisfies Config;
