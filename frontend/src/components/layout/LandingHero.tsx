import { useCallback, useRef, useState, useEffect } from "react";
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
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease },
  },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
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
// Animated Mesh Gradient Background
// ---------------------------------------------------------------------------

function MeshBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Dot grid pattern */}
      <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="hero-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.6" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-grid)" className="text-white/[0.04]" />
      </svg>
      {/* Gradient mesh blobs */}
      <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-[#3b82f6]/[0.06] blur-[140px]" />
      <div className="absolute top-1/3 right-0 h-[500px] w-[500px] rounded-full bg-[#23D18B]/[0.04] blur-[120px]" />
      <div className="absolute bottom-0 left-1/3 h-[400px] w-[400px] rounded-full bg-[#F59E0B]/[0.03] blur-[100px]" />
      {/* Radial fade to base */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#06090E_70%)]" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Animated Hero Visual (abstract chart preview)
// ---------------------------------------------------------------------------

function HeroVisual({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <motion.div
      variants={fadeUp}
      className="relative mx-auto mt-12 max-w-3xl sm:mt-16"
    >
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#0C1219] to-[#121C28] p-1 shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
        {/* Glow effect behind card */}
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#3b82f6]/20 via-[#23D18B]/10 to-[#3b82f6]/20 opacity-50 blur-xl" />

        <div className="relative rounded-xl bg-[#0a0e14] p-6 sm:p-8">
          {/* Mock app header */}
          <div className="mb-6 flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-[#ef4444]/60" />
            <div className="h-3 w-3 rounded-full bg-[#F59E0B]/60" />
            <div className="h-3 w-3 rounded-full bg-[#23D18B]/60" />
            <div className="ml-4 h-3 w-32 rounded bg-white/[0.06]" />
          </div>

          {/* Mock efficient frontier chart */}
          <svg viewBox="0 0 600 280" className="w-full" preserveAspectRatio="xMidYMid meet">
            {/* Grid */}
            {Array.from({ length: 6 }).map((_, i) => (
              <line key={`h-${i}`} x1="40" y1={40 + i * 40} x2="580" y2={40 + i * 40} stroke="#1a2535" strokeWidth="0.5" />
            ))}
            {Array.from({ length: 7 }).map((_, i) => (
              <line key={`v-${i}`} x1={40 + i * 90} y1="40" x2={40 + i * 90} y2="240" stroke="#1a2535" strokeWidth="0.5" />
            ))}

            {/* Gradient fill under frontier */}
            <defs>
              <linearGradient id="frontier-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M80,200 Q200,180 280,140 Q360,100 440,85 Q500,78 540,80 L540,240 L80,240 Z" fill="url(#frontier-fill)" />

            {/* Frontier curve */}
            <motion.path
              d="M80,200 Q200,180 280,140 Q360,100 440,85 Q500,78 540,80"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2.5"
              initial={reducedMotion ? {} : { pathLength: 0 }}
              animate={reducedMotion ? {} : { pathLength: 1 }}
              transition={{ duration: 1.8, delay: 0.8, ease: [0.4, 0, 0.2, 1] }}
            />

            {/* Data points */}
            {[
              { x: 120, y: 192, c: "#94A3B8" },
              { x: 200, y: 172, c: "#94A3B8" },
              { x: 280, y: 140, c: "#3b82f6" },
              { x: 360, y: 108, c: "#3b82f6" },
              { x: 440, y: 85, c: "#23D18B" },
              { x: 500, y: 80, c: "#23D18B" },
            ].map((pt, i) => (
              <motion.circle
                key={i}
                cx={pt.x}
                cy={pt.y}
                r={4}
                fill={pt.c}
                initial={reducedMotion ? {} : { opacity: 0, scale: 0 }}
                animate={reducedMotion ? {} : { opacity: 0.8, scale: 1 }}
                transition={{ delay: 1.2 + i * 0.15, duration: 0.4 }}
              />
            ))}

            {/* Recommended point */}
            <motion.g
              initial={reducedMotion ? {} : { opacity: 0, scale: 0 }}
              animate={reducedMotion ? {} : { opacity: 1, scale: 1 }}
              transition={{ delay: 2.2, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
            >
              <circle cx="440" cy="85" r="12" fill="none" stroke="#23D18B" strokeWidth="2" opacity="0.6" />
              <circle cx="440" cy="85" r="5" fill="#23D18B" />
              <text x="456" y="80" fill="#23D18B" fontSize="10" fontWeight="600" fontFamily="Inter, sans-serif">Recommended</text>
            </motion.g>

            {/* Axis labels */}
            <text x="310" y="268" fill="#64748B" fontSize="10" textAnchor="middle" fontFamily="Inter, sans-serif">Portfolio Risk</text>
            <text x="14" y="145" fill="#64748B" fontSize="10" textAnchor="middle" fontFamily="Inter, sans-serif" transform="rotate(-90, 14, 145)">Expected NPV</text>
          </svg>

          {/* Mock metric pills below chart */}
          <div className="mt-4 flex flex-wrap gap-3">
            {[
              { label: "Portfolio NPV", value: "$287M", color: "text-[#23D18B]" },
              { label: "Capital Deployed", value: "$142M", color: "text-white/80" },
              { label: "Prospects", value: "15", color: "text-white/80" },
              { label: "Risk Level", value: "Moderate", color: "text-[#F59E0B]" },
            ].map((m) => (
              <div key={m.label} className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-1.5">
                <span className="text-[11px] text-white/40">{m.label}</span>
                <span className={`text-xs font-semibold ${m.color}`} style={{ fontFeatureSettings: "'tnum'" }}>{m.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Value Proposition Card
// ---------------------------------------------------------------------------

interface ValuePropProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function ValuePropCard({ icon, title, description }: ValuePropProps) {
  return (
    <motion.div
      variants={cardVariants}
      className="group flex flex-col rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 transition-colors duration-200 hover:border-white/[0.12] hover:bg-white/[0.04]"
    >
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[#3b82f6]/10 text-[#3b82f6]">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-white/90">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-white/50">{description}</p>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// How It Works Step
// ---------------------------------------------------------------------------

interface HowItWorksStepProps {
  number: number;
  title: string;
  description: string;
  isLast?: boolean;
}

function HowItWorksStep({ number, title, description, isLast }: HowItWorksStepProps) {
  return (
    <motion.div variants={fadeUp} className="relative flex flex-col items-center text-center">
      {/* Step number */}
      <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-[#3b82f6]/30 bg-[#3b82f6]/10 text-sm font-semibold text-[#3b82f6]">
        {number}
      </div>
      {/* Connector line */}
      {!isLast && (
        <div className="absolute left-1/2 top-10 hidden h-px w-[calc(100%+2rem)] -translate-x-0 translate-y-5 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent lg:block" style={{ left: "50%" }} />
      )}
      <h4 className="mt-4 text-sm font-semibold text-white/80">{title}</h4>
      <p className="mt-1.5 max-w-[200px] text-xs leading-relaxed text-white/40">{description}</p>
    </motion.div>
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
  const accentColor = isGom ? "#3b82f6" : "#23D18B";

  return (
    <motion.div
      variants={cardVariants}
      whileHover={reducedMotion ? undefined : { y: -4 }}
      className="group relative flex-1 cursor-pointer overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] transition-all duration-200 hover:border-white/[0.12] hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#06090E] focus-within:ring-2 focus-within:ring-[#3b82f6]/50"
      onClick={onLaunch}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onLaunch()}
      aria-label={`Launch ${scenario.title} demo`}
    >
      {/* Top accent bar */}
      <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent, ${accentColor}40, transparent)` }} />

      <div className="p-6">
        {/* Icon + badge */}
        <div className="mb-4 flex items-start justify-between">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg text-lg"
            style={{ backgroundColor: `${accentColor}15` }}
          >
            {isGom ? "🌊" : "🏜️"}
          </div>
          <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 text-[11px] font-medium text-white/50">
            {scenario.prospectCount} prospects
          </span>
        </div>

        <h3 className="text-base font-semibold text-white/90">{scenario.title}</h3>
        <p className="mt-1 text-xs font-medium text-white/40">{scenario.stats}</p>
        <p className="mt-3 text-sm leading-relaxed text-white/50">{scenario.description}</p>

        {/* Mini bar chart */}
        <div className="mt-4 flex items-end gap-1 h-8">
          {Array.from({ length: scenario.prospectCount }).map((_, i) => {
            const h = 8 + Math.sin(i * 1.8 + 0.5) * 12 + Math.cos(i * 0.7) * 8;
            return (
              <div
                key={i}
                className="flex-1 rounded-t transition-all duration-200 group-hover:opacity-100"
                style={{
                  height: `${Math.max(4, Math.min(32, h))}px`,
                  backgroundColor: accentColor,
                  opacity: 0.4 + (i % 3) * 0.15,
                }}
              />
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-5 flex items-center justify-between">
          <span className="text-sm font-medium focus-visible:ring-2" style={{ color: accentColor }}>
            Launch Demo
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-200 group-hover:translate-x-1">
            <path d="M5 12h14" />
            <path d="M12 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// SVG Icons (Lucide-style)
// ---------------------------------------------------------------------------

function BarChart3Icon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 20V10" />
      <path d="M12 20V4" />
      <path d="M6 20v-6" />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
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
    <div className="relative min-h-screen bg-[#06090E] text-white overflow-x-hidden">
      <MeshBackground />

      {/* ── Hero Section ────────────────────────────────────── */}
      <motion.section
        className="relative z-10 mx-auto max-w-6xl px-6 pb-16 pt-20 sm:pt-28"
        variants={prefersReducedMotion ? undefined : containerVariants}
        initial={prefersReducedMotion ? undefined : "hidden"}
        animate={prefersReducedMotion ? undefined : "visible"}
      >
        {/* Badge */}
        <motion.div variants={fadeUp} className="flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-1.5 text-xs text-white/50">
            <span className="h-1.5 w-1.5 rounded-full bg-[#23D18B]" />
            E&P Decision Engine
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={fadeUp}
          className="mx-auto mt-8 max-w-3xl text-center text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl"
        >
          <span className="bg-gradient-to-r from-[#23D18B] to-[#3b82f6] bg-clip-text text-transparent">
            Portfolio Optimization
          </span>{" "}
          for E&P
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          variants={fadeUp}
          className="mx-auto mt-6 max-w-2xl text-center text-base leading-relaxed text-white/50 sm:text-lg"
        >
          Monte Carlo simulation and portfolio optimization that turns geological
          uncertainty into capital allocation decisions.
        </motion.p>

        {/* CTAs */}
        <motion.div
          variants={fadeUp}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <button
            type="button"
            onClick={onStartAnalysis}
            className="group relative inline-flex items-center gap-2 rounded-xl bg-[#23D18B] px-7 py-3.5 text-sm font-semibold text-[#0a0e14] shadow-[0_0_20px_rgba(35,209,139,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_30px_rgba(35,209,139,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#23D18B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#06090E]"
          >
            Start New Analysis
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-200 group-hover:translate-x-0.5">
              <path d="M5 12h14" />
              <path d="M12 5l7 7-7 7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={scrollToDemos}
            className="inline-flex items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.03] px-7 py-3.5 text-sm font-medium text-white/70 transition-all duration-200 hover:border-white/[0.2] hover:text-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[#06090E]"
          >
            Explore Demos
          </button>
        </motion.div>

        {/* Hero Visual */}
        <HeroVisual reducedMotion={prefersReducedMotion} />
      </motion.section>

      {/* ── Value Propositions ──────────────────────────────── */}
      <motion.section
        className="relative z-10 mx-auto max-w-5xl px-6 py-24"
        variants={prefersReducedMotion ? undefined : containerVariants}
        initial={prefersReducedMotion ? undefined : "hidden"}
        whileInView={prefersReducedMotion ? undefined : "visible"}
        viewport={{ once: true, amount: 0.2 }}
      >
        <motion.div variants={fadeUp} className="text-center">
          <h2 className="text-2xl font-bold text-white/90 sm:text-3xl">
            Built for Exploration & Production
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-white/40">
            From geological uncertainty to investment decisions, in one integrated workflow.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          <ValuePropCard
            icon={<BarChart3Icon />}
            title="Probabilistic Modeling"
            description="Run 10,000+ Monte Carlo simulations per prospect. See the full range of outcomes, not just the base case."
          />
          <ValuePropCard
            icon={<TargetIcon />}
            title="Capital Allocation"
            description="Find the efficient frontier. Know exactly how to allocate your capital budget to maximize risk-adjusted returns."
          />
          <ValuePropCard
            icon={<EyeIcon />}
            title="Visual Decision Support"
            description="Interactive 3D subsurface views, tornado charts, and scenario dashboards that make complex tradeoffs intuitive."
          />
        </div>
      </motion.section>

      {/* ── How It Works ───────────────────────────────────── */}
      <motion.section
        className="relative z-10 mx-auto max-w-4xl px-6 py-24"
        variants={prefersReducedMotion ? undefined : containerVariants}
        initial={prefersReducedMotion ? undefined : "hidden"}
        whileInView={prefersReducedMotion ? undefined : "visible"}
        viewport={{ once: true, amount: 0.2 }}
      >
        <motion.div variants={fadeUp} className="text-center">
          <h2 className="text-2xl font-bold text-white/90 sm:text-3xl">
            How It Works
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-white/40">
            Four steps from raw prospect data to optimized capital allocation.
          </p>
        </motion.div>

        <div className="mt-14 grid grid-cols-2 gap-8 sm:gap-12 lg:grid-cols-4">
          <HowItWorksStep
            number={1}
            title="Define Prospects"
            description="Add prospect locations, resource estimates, and well economics."
          />
          <HowItWorksStep
            number={2}
            title="Set Price Scenarios"
            description="Choose commodity price paths from base to extreme cases."
          />
          <HowItWorksStep
            number={3}
            title="Optimize"
            description="Find the efficient frontier and optimal capital allocation."
          />
          <HowItWorksStep
            number={4}
            title="Decide"
            description="Review drill, farm-out, divest, and defer recommendations."
            isLast
          />
        </div>
      </motion.section>

      {/* ── Demo Section ───────────────────────────────────── */}
      <motion.section
        ref={demosRef}
        className="relative z-10 mx-auto max-w-5xl px-6 py-24"
        variants={prefersReducedMotion ? undefined : containerVariants}
        initial={prefersReducedMotion ? undefined : "hidden"}
        whileInView={prefersReducedMotion ? undefined : "visible"}
        viewport={{ once: true, amount: 0.2 }}
      >
        <motion.div variants={fadeUp} className="text-center">
          <h2 className="text-2xl font-bold text-white/90 sm:text-3xl">
            See It In Action
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-white/40">
            Pre-loaded scenarios with full simulation results. Explore every view in under a minute.
          </p>
        </motion.div>

        <div className="mt-12 flex flex-col gap-6 md:flex-row">
          {DEMO_SCENARIOS.map((scenario) => (
            <DemoCard
              key={scenario.id}
              scenario={scenario}
              onLaunch={() => onLaunchDemo(scenario.id)}
              reducedMotion={prefersReducedMotion}
            />
          ))}
        </div>
      </motion.section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/[0.06] px-6 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-3 text-sm text-white/30">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/20">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            <span>Prospect Engine</span>
            <span className="text-white/10">|</span>
            <span>Built by Incerta Intelligence</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-white/30">
            <a href="https://github.com/bdavis37-tal/prospect-engine" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-white/60">GitHub</a>
            <span className="text-white/10">|</span>
            <span>BSL 1.1 License</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingHero;
