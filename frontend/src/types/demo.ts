import type { DecisionType } from "./portfolio";

export interface DemoScenarioMeta {
  id: "permian" | "gom";
  title: string;
  description: string;
  stats: string;
  prospectCount: number;
  budget: number;
  basins: string;
}

export interface ResourceDistribution {
  p10: number;
  p50: number;
  p90: number;
  distribution_type: string;
  unit: string;
}

export interface DistributionParams {
  base: number;
  low: number;
  high: number;
  distribution_type: string;
}

export interface DeclineParameters {
  initial_production_rate: number;
  initial_decline_rate: number;
  b_factor: number;
  terminal_decline_rate: number;
  well_life_years: number;
}

export interface DemoProspect {
  prospect_id: string;
  name: string;
  latitude: number;
  longitude: number;
  basin: string;
  hydrocarbon_type: string;
  water_depth_ft?: number;
  resource_estimate: ResourceDistribution;
  recovery_factor: DistributionParams;
  well_cost: DistributionParams;
  completion_cost: DistributionParams;
  facility_cost: number;
  opex_per_boe: DistributionParams;
  royalty_rate: number;
  tax_rate: number;
  working_interest: number;
  decline_params: DeclineParameters;
  infrastructure_distance_miles?: number;
  lease_expiry_years?: number;
  notes?: string;
}

export interface DemoInput {
  prospects: DemoProspect[];
  capital_budget: number;
  discount_rate: number;
  simulation_iterations: number;
  price_scenarios: unknown[];
  constraints: {
    mandatory_drill?: string[];
    max_single_prospect_pct_of_budget?: number;
  };
}

export interface DistributionSummary {
  mean: number;
  std: number;
  p10: number;
  p50: number;
  p90: number;
  min: number;
  max: number;
}

export interface BinData {
  bin_start: number;
  bin_end: number;
  frequency: number;
}

export interface SimulationResult {
  prospect_id: string;
  n_iterations: number;
  npv_distribution: DistributionSummary;
  irr_distribution: DistributionSummary;
  payout_distribution: DistributionSummary;
  probability_positive_npv: number;
  expected_npv: number;
  expected_irr: number;
  npv_histogram_data: BinData[];
  irr_histogram_data: BinData[];
  capital_at_risk: number;
  risk_reward_ratio: number;
  annual_cash_flows_p10: number[];
  annual_cash_flows_p50: number[];
  annual_cash_flows_p90: number[];
  sample_npvs: number[];
}

export interface DecisionMetrics {
  decision_type: DecisionType;
  expected_npv: number;
  capital_required: number;
  probability_positive_npv: number;
  capital_efficiency: number;
}

export interface DecisionComparison {
  prospect_id: string;
  options: Record<DecisionType, DecisionMetrics>;
  recommendation: DecisionType;
}

export interface SensitivityItem {
  variable_name: string;
  low_case_value: number;
  low_case_npv: number;
  high_case_value: number;
  high_case_npv: number;
  swing: number;
}

export interface TornadoResult {
  base_case_npv: number;
  sensitivities: SensitivityItem[];
}

export interface ProspectResult {
  prospect_id: string;
  simulation: SimulationResult;
  decision_comparison: DecisionComparison;
  tornado: TornadoResult;
}

export interface FrontierPoint {
  expected_npv: number;
  portfolio_risk: number;
  allocation: Record<string, DecisionType>;
  capital_deployed: number;
  capital_remaining: number;
}

export interface PortfolioOptimizationResult {
  efficient_frontier: FrontierPoint[];
  recommended_portfolio: FrontierPoint;
  current_portfolio?: FrontierPoint;
  prospect_robustness: Record<string, Record<string, DecisionType>>;
  total_portfolio_npv_distribution: DistributionSummary;
  diversification_benefit: number;
}

export interface ScenarioResult {
  scenario_name: string;
  optimization_result: PortfolioOptimizationResult;
}

export interface ScenarioComparison {
  scenario_results: ScenarioResult[];
  robust_prospects: string[];
  fragile_prospects: string[];
}

export interface DemoResults {
  scenario_name: string;
  n_iterations: number;
  random_seed: number;
  n_prospects: number;
  capital_budget: number;
  discount_rate: number;
  prospect_results: ProspectResult[];
  scenario_comparison: ScenarioComparison;
}

// 3D Scene types
export interface GeologicalLayer {
  name: string;
  depth_ft: number;
  color: string;
  opacity: number;
}

export interface Prospect3D {
  prospect_id: string;
  water_depth_ft?: number;
  target_depth_ft: number;
  formation: string;
}

export interface Infrastructure3D {
  name: string;
  latitude: number;
  longitude: number;
  type: string;
  water_depth_ft?: number;
}

export interface TiebackConnection {
  from_prospect: string;
  to_infrastructure: string;
  distance_miles: number;
  type: string;
}

export interface Pipeline3D {
  from: string;
  to: string;
  diameter_in: number;
}

export interface CameraPreset {
  position: [number, number, number];
  target: [number, number, number];
}

export interface Demo3DScene {
  scene_type: "onshore" | "offshore";
  bounds: {
    lat_min: number;
    lat_max: number;
    lon_min: number;
    lon_max: number;
  };
  surface_elevation_ft?: number;
  sea_level_ft?: number;
  geological_layers: GeologicalLayer[];
  prospect_3d: Prospect3D[];
  infrastructure: Infrastructure3D[];
  tieback_connections?: TiebackConnection[];
  pipelines: Pipeline3D[];
  camera_presets: Record<string, CameraPreset>;
}

export interface DemoData {
  input: DemoInput;
  results: DemoResults;
  scene3d: Demo3DScene;
}
