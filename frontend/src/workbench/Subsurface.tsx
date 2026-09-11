import { useEffect, useState } from "react";
import type { AnalysisResult } from "../types/api.generated";
import type { Demo3DScene } from "../types/demo";
import { SubsurfaceScene } from "../components/three/SubsurfaceScene";
export default function Subsurface({
  sample,
  analysis,
  scenario,
}: {
  sample: "permian" | "gom";
  analysis: AnalysisResult;
  scenario: string;
}) {
  const [scene, setScene] = useState<Demo3DScene | null>(null);
  useEffect(() => {
    (sample === "permian"
      ? import("../data/demos/permian/demo_3d_scene.json")
      : import("../data/demos/gom/demo_3d_scene.json")
    ).then((m) => setScene(m.default as unknown as Demo3DScene));
  }, [sample]);
  const result =
    analysis.scenario_comparison.scenario_results.find(
      (s) => s.scenario_name === scenario,
    ) ?? analysis.scenario_comparison.scenario_results[0];
  if (!scene) return <p>Loading illustration…</p>;
  return (
    <div className="subsurface-container">
      <SubsurfaceScene
        scene3d={scene}
        prospects={analysis.input.prospects.map((p) => ({
          ...p,
          water_depth_ft: p.water_depth_ft ?? undefined,
          infrastructure_distance_miles:
            p.infrastructure_distance_miles ?? undefined,
          lease_expiry_years: p.lease_expiry_years ?? undefined,
          notes: p.notes ?? undefined,
        }))}
        decisions={result.optimization_result.recommended_portfolio.allocation}
      />
    </div>
  );
}
