import { useMemo, useState } from "react";
import type { PortfolioState, ProspectInput } from "../types/portfolio";

const seedProspect: ProspectInput = {
  prospect_id: "seed-1",
  name: "Starter Prospect",
  basin: "permian_delaware",
  latitude: 31.8,
  longitude: -103.4
};

export function usePortfolioState() {
  const [state, setState] = useState<PortfolioState>({
    mode: "quick",
    prospects: [seedProspect],
    selectedScenarios: ["Base Case", "Bull Case", "Bear Case"],
    budget: 40_000_000,
    discountRate: 0.1
  });

  const addProspect = (prospect: ProspectInput) => setState((prev) => ({ ...prev, prospects: [...prev.prospects, prospect] }));
  const summary = useMemo(() => ({ count: state.prospects.length, budgetMM: state.budget / 1_000_000 }), [state]);

  return { state, setState, addProspect, summary };
}