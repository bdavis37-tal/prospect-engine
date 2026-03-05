import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0B1017",
        panel: "#121A25",
        drill: "#23D18B",
        farm: "#2FA7FF",
        divest: "#F97316",
        defer: "#94A3B8"
      }
    }
  },
  plugins: []
} satisfies Config;