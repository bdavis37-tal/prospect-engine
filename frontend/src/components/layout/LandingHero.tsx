import { useCallback, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { DEMO_SCENARIOS } from "../../hooks/useDemoMode";
import type { DemoScenarioMeta } from "../../types/demo";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface LandingHeroProps {
  onStartAnalysis: () => void;
  onLaunchDemo: (id: "permian" | "gom") => void;
}

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.15 },
  },
};

const ease = [0.4, 0, 0.2, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease },
  },
};

// ---------------------------------------------------------------------------
// Animated Grid Background
// ---------------------------------------------------------------------------

function GridBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Dot grid pattern */}
      <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="hero-grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-grid)" className="text-text-tertiary/20" />
      </svg>
      {/* Radial gradient overlay for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--color-surface-base)_70%)]" />
      {/* Subtle glow accent */}
      <motion.div
        className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-data-info/5 blur-[120px]"
        animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.6, 0.4] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mini Chart SVG for demo card hover preview
// ---------------------------------------------------------------------------

function MiniChart({ prospectCount, color }: { prospectCount: number; color: string }) {
  // Generate deterministic bar heights for the mini histogram
  const bars = Array.from({ length: prospectCount }, (_, i) => {
    const h = 12 + Math.sin(i * 1.8 + 0.5) * 10 + Math.cos(i * 0.7) * 8;
    return Math.max(4, Math.min(32, h));
  });
  const barWidth = Math.min(10, 120 / prospectCount);
  const gap = 2;
  const totalWidth = bars.length * (barWidth + gap) - gap;

  return (
    <svg
      viewBox={`0 0 ${totalWidth} 36`}
      className="mx-auto mt-2 h-9 opacity-70 transition-opacity duration-200 group-hover:opacity-100"
      aria-hidden="true"
    >
      {bars.map((h, i) => (
        <rect
          key={i}
          x={i * (barWidth + gap)}
          y={36 - h}
          width={barWidth}
          height={h}
          rx={1.5}
          fill={color}
          opacity={0.7 + (i % 3) * 0.1}
        />
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Demo Card
// ---------------------------------------------------------------------------

interface DemoCardProps {
  scenario: DemoScenarioMeta;
  onLaunch: () => void;
  reducedMotion: boolean;
}

function DemoCard({ scenario, onLaunch, reducedMotion }: DemoCardProps) {
  const isGom = scenario.id === "gom";
  const accentColor = isGom ? "#2FA7FF" : "#23D18B";
  const gradientClass = isGom
    ? "from-blue-900/30 to-cyan-900/15"
    : "from-emerald-900/30 to-amber-900/15";

  return (
    <motion.div
      variants={cardVariants}
      whileHover={reducedMotion ? undefined : { y: -4, scale: 1.02 }}
      whileFocus={reducedMotion ? undefined : { y: -4, scale: 1.02 }}
      className="group relative flex-1 cursor-pointer rounded-radius-lg border border-surface-border-subtle bg-surface-raised/80 p-5 backdrop-blur-sm transition-shadow hover:border-surface-border-default hover:shadow-elevation-medium focus-within:ring-2 focus-within:ring-surface-border-focus"
      style={{
        boxShadow: undefined,
      }}
    >
      {/* Hover glow effect */}
      <div
        className="pointer-events-none absolute -inset-px rounded-radius-lg opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(400px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), ${accentColor}15, transparent 60%)`,
        }}
        aria-hidden="true"
      />

      {/* Preview area */}
      <div
        className={`relative mb-4 flex h-36 w-full items-center justify-center overflow-hidden rounded-radius-md bg-gradient-to-br ${gradientClass}`}
      >
        <div className="text-center">
          <div className="text-3xl" aria-hidden="true">
            {isGom ? "🌊" : "🏜️"}
          </div>
          <p className="mt-1 text-[10px] text-text-secondary">
            {scenario.prospectCount} prospects across{" "}
            {isGom ? "deepwater blocks" : "two sub-basins"}
          </p>
          <MiniChart prospectCount={scenario.prospectCount} color={accentColor} />
        </div>
      </div>

      {/* Content */}
      <h3 className="text-subheading font-semibold text-text-primary">{scenario.title}</h3>
      <p className="mt-1 text-caption text-text-tertiary">{scenario.stats}</p>
      <p className="mt-2 text-caption leading-relaxed text-text-secondary">
        {scenario.description}
      </p>

      {/* Launch button */}
      <button
        type="button"
        onClick={onLaunch}
        className={`mt-4 w-full rounded-radius-md py-2.5 text-sm font-medium transition-colors duration-animation-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base ${
          isGom
            ? "bg-data-info/80 text-text-primary hover:bg-data-info"
            : "bg-data-positive/80 text-text-inverse hover:bg-data-positive"
        }`}
      >
        Launch Demo
      </button>
    </motion.div>
  );
}


// ---------------------------------------------------------------------------
// LandingHero Component
// ---------------------------------------------------------------------------

export function LandingHero({ onStartAnalysis, onLaunchDemo }: LandingHeroProps) {
  const prefersReducedMotion = useReducedMotion() ?? false;
  const demosRef = useRef<HTMLDivElement>(null);

  const scrollToDemos = useCallback(() => {
    demosRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div className="relative min-h-screen bg-surface-base text-text-primary">
      <GridBackground />

      {/* Hero content */}
      <motion.div
        className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-16"
        variants={prefersReducedMotion ? undefined : containerVariants}
        initial={prefersReducedMotion ? undefined : "hidden"}
        animate={prefersReducedMotion ? undefined : "visible"}
      >
        {/* Headline */}
        <motion.h1
          variants={prefersReducedMotion ? undefined : fadeUp}
          className="text-center text-4xl font-bold tracking-tight text-text-primary sm:text-5xl md:text-display md:tracking-display"
        >
          Portfolio Optimization,{" "}
          <span className="bg-gradient-to-r from-data-positive to-data-info bg-clip-text text-transparent">
            Reimagined
          </span>
        </motion.h1>

        {/* Subtext */}
        <motion.p
          variants={prefersReducedMotion ? undefined : fadeUp}
          className="mt-4 max-w-2xl text-center text-body leading-relaxed text-text-secondary sm:mt-6"
        >
          Monte Carlo simulation meets interactive 3D visualization. Build, optimize,
          and explore oil &amp; gas portfolios with real-time scenario analysis and
          decision-grade insights.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          variants={prefersReducedMotion ? undefined : fadeUp}
          className="mt-8 flex flex-wrap items-center justify-center gap-4 sm:mt-10"
        >
          <button
            type="button"
            onClick={onStartAnalysis}
            className="rounded-radius-md bg-data-positive px-6 py-3 text-sm font-semibold text-text-inverse shadow-elevation-low transition-all duration-animation-fast hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-data-positive focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base"
          >
            Start New Analysis
          </button>
          <button
            type="button"
            onClick={scrollToDemos}
            className="rounded-radius-md border border-surface-border-default px-6 py-3 text-sm font-medium text-text-secondary transition-colors duration-animation-fast hover:border-surface-border-focus hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base"
          >
            Explore Demos
          </button>
        </motion.div>

        {/* Demo Cards */}
        <motion.div
          ref={demosRef}
          variants={prefersReducedMotion ? undefined : fadeUp}
          className="mt-16 flex w-full flex-col gap-5 sm:mt-20 md:flex-row"
        >
          {DEMO_SCENARIOS.map((scenario) => (
            <DemoCard
              key={scenario.id}
              scenario={scenario}
              onLaunch={() => onLaunchDemo(scenario.id)}
              reducedMotion={prefersReducedMotion}
            />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}

export default LandingHero;
