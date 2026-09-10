import type { Config } from "tailwindcss";
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: { extend: { colors: { canvas:"var(--wb-canvas)", surface:"var(--wb-surface)", ink:"var(--wb-ink)", muted:"var(--wb-muted)", action:"var(--wb-action)" } } },
  plugins: [],
} satisfies Config;
