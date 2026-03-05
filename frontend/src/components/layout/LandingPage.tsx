import { DEMO_SCENARIOS } from "../../hooks/useDemoMode";
import type { DemoScenarioMeta } from "../../types/demo";

interface LandingPageProps {
  onStartAnalysis: () => void;
  onLaunchDemo: (id: "permian" | "gom") => void;
}

function DemoCard({ scenario, onLaunch }: { scenario: DemoScenarioMeta; onLaunch: () => void }) {
  const isGom = scenario.id === "gom";
  return (
    <div className="flex-1 rounded-xl border border-slate-700/60 bg-panel/80 p-5 hover:border-slate-600 transition-colors">
      {/* Thumbnail preview */}
      <div
        className={`w-full h-36 rounded-lg mb-4 flex items-center justify-center text-xs ${
          isGom ? "bg-gradient-to-br from-blue-900/40 to-cyan-900/20" : "bg-gradient-to-br from-amber-900/30 to-orange-900/15"
        }`}
      >
        <div className="text-center">
          <div className="text-3xl mb-1">{isGom ? "🌊" : "🏜️"}</div>
          <div className="text-slate-400 text-[10px]">
            {scenario.prospectCount} prospects across{" "}
            {isGom ? "deepwater blocks" : "two sub-basins"}
          </div>
          <svg viewBox="0 0 200 80" className="w-32 h-12 mx-auto mt-1 opacity-60">
            {/* Simplified mini-map showing prospect pins */}
            {Array.from({ length: scenario.prospectCount }).map((_, i) => {
              const cx = 20 + (i % 5) * 35 + Math.sin(i * 1.7) * 10;
              const cy = 15 + Math.floor(i / 5) * 22 + Math.cos(i * 2.3) * 5;
              return (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={3}
                  fill={["#23D18B", "#2FA7FF", "#F97316", "#94A3B8"][i % 4]}
                  opacity={0.8}
                />
              );
            })}
          </svg>
        </div>
      </div>

      <h3 className="text-base font-semibold text-slate-100">{scenario.title}</h3>
      <p className="text-xs text-slate-500 mt-1">{scenario.stats}</p>
      <p className="text-xs text-slate-400 mt-2 leading-relaxed">{scenario.description}</p>

      <button
        onClick={onLaunch}
        className={`mt-4 w-full py-2 rounded-lg text-sm font-medium transition-colors ${
          isGom
            ? "bg-blue-600/80 text-white hover:bg-blue-500"
            : "bg-drill/80 text-black hover:bg-drill"
        }`}
      >
        Launch Demo
      </button>
    </div>
  );
}

export function LandingPage({ onStartAnalysis, onLaunchDemo }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-bg text-slate-100 flex flex-col">
      {/* Hero */}
      <div className="flex-shrink-0 px-6 pt-12 pb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          prospect-engine
        </h1>
        <p className="text-slate-400 mt-2 text-base max-w-lg mx-auto">
          Oil and gas exploration portfolio optimizer with Monte Carlo simulation,
          multi-scenario analysis, and interactive 3D subsurface visualization.
        </p>
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            onClick={onStartAnalysis}
            className="px-6 py-2.5 rounded-lg bg-drill text-black font-medium hover:brightness-110 transition"
          >
            Start New Analysis
          </button>
          <a
            href="#demos"
            className="px-6 py-2.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 transition"
          >
            Explore Demo
          </a>
        </div>
      </div>

      {/* Demo Section */}
      <div id="demos" className="flex-1 px-6 pb-12 max-w-4xl mx-auto w-full">
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-slate-200">See It In Action</h2>
          <p className="text-sm text-slate-500 mt-1">
            Pre-loaded scenarios with full simulation results — explore every view in under a minute.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          {DEMO_SCENARIOS.map((scenario) => (
            <DemoCard
              key={scenario.id}
              scenario={scenario}
              onLaunch={() => onLaunchDemo(scenario.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
