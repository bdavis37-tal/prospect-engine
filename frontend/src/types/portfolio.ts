export type DecisionType = "drill" | "farm_out" | "divest" | "defer";

export interface ProspectInput {
  prospect_id: string;
  name: string;
  basin: string;
  latitude: number;
  longitude: number;
}

export interface PortfolioState {
  mode: "quick" | "deep";
  prospects: ProspectInput[];
  selectedScenarios: string[];
  budget: number;
  discountRate: number;
}