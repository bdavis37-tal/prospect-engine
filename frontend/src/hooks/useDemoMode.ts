import { useState, useCallback } from "react";
import type { DemoData, DemoInput, DemoResults, Demo3DScene, DemoScenarioMeta } from "../types/demo";

// Static imports for demo data
import permianInput from "../data/demos/permian/demo_input.json";
import permianResults from "../data/demos/permian/demo_results.json";
import permianScene from "../data/demos/permian/demo_3d_scene.json";
import gomInput from "../data/demos/gom/demo_input.json";
import gomResults from "../data/demos/gom/demo_results.json";
import gomScene from "../data/demos/gom/demo_3d_scene.json";

export const DEMO_SCENARIOS: DemoScenarioMeta[] = [
  {
    id: "permian",
    title: "Permian Basin Growth Portfolio",
    description:
      "Optimize a mixed development and exploration portfolio with lease obligations, farm-out opportunities, and a divestiture decision.",
    stats: "15 Prospects · $150M Budget · Delaware & Midland Basins",
    prospectCount: 15,
    budget: 150_000_000,
    basins: "Delaware & Midland",
  },
  {
    id: "gom",
    title: "Gulf of Mexico Deepwater Exploration",
    description:
      "Navigate extreme capital intensity, infrastructure tieback decisions, and frontier exploration risk in the deepwater Gulf.",
    stats: "8 Prospects · $600M Budget · Ultra-Deepwater",
    prospectCount: 8,
    budget: 600_000_000,
    basins: "GOM Deepwater",
  },
];

function loadDemoData(scenarioId: "permian" | "gom"): DemoData {
  if (scenarioId === "permian") {
    return {
      input: permianInput as unknown as DemoInput,
      results: permianResults as unknown as DemoResults,
      scene3d: permianScene as unknown as Demo3DScene,
    };
  }
  return {
    input: gomInput as unknown as DemoInput,
    results: gomResults as unknown as DemoResults,
    scene3d: gomScene as unknown as Demo3DScene,
  };
}

export type DemoState =
  | { mode: "landing" }
  | { mode: "guided" }
  | { mode: "demo"; scenarioId: "permian" | "gom"; data: DemoData };

export function useDemoMode() {
  const [state, setState] = useState<DemoState>({ mode: "landing" });

  const launchDemo = useCallback((scenarioId: "permian" | "gom") => {
    const data = loadDemoData(scenarioId);
    setState({ mode: "demo", scenarioId, data });
  }, []);

  const startGuidedFlow = useCallback(() => {
    setState({ mode: "guided" });
  }, []);

  const returnToLanding = useCallback(() => {
    setState({ mode: "landing" });
  }, []);

  const switchDemo = useCallback(() => {
    if (state.mode === "demo") {
      const nextId = state.scenarioId === "permian" ? "gom" : "permian";
      const data = loadDemoData(nextId);
      setState({ mode: "demo", scenarioId: nextId, data });
    }
  }, [state]);

  const meta = state.mode === "demo" ? DEMO_SCENARIOS.find((s) => s.id === state.scenarioId) : null;

  return { state, launchDemo, startGuidedFlow, returnToLanding, switchDemo, meta };
}
