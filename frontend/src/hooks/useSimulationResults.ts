import { useCallback, useState } from "react";

export interface SimulationSnapshot {
  expectedNPV: number;
  risk: number;
  capitalDeployed: number;
}

export function useSimulationResults() {
  const [result, setResult] = useState<SimulationSnapshot | null>(null);
  const [loading, setLoading] = useState(false);

  const run = useCallback(async () => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    setResult({ expectedNPV: 82_500_000, risk: 31_200_000, capitalDeployed: 39_000_000 });
    setLoading(false);
  }, []);

  return { result, loading, run };
}