import type {
  Basin,
  CommodityPriceScenario,
  PortfolioInput,
  Prospect,
} from "../types/api.generated";
import benchmarks from "../data/benchmarks.json";
export const basins = Object.keys(benchmarks) as Basin[];
const distribution = (base: number, spread = 0.2) => ({
  low: base * (1 - spread),
  base,
  high: base * (1 + spread),
  distribution_type: "triangular" as const,
});
export function newProspect(basin: Basin = "permian_delaware"): Prospect {
  const b = benchmarks[basin] as Record<string, unknown>;
  const mid = (key: string, fallback: number) => {
    const v = b[key] as number[] | undefined;
    return v ? (v[0] + v[1]) / 2 : fallback;
  };
  const gas = !!b.eur_bcf;
  const resource = mid(
    gas ? "eur_bcf" : b.eur_mmboe ? "eur_mmboe" : "eur_mboe",
    800,
  );
  const well = mid("well_cost_musd", 6) * 1e6;
  return {
    prospect_id: crypto.randomUUID(),
    name: "New prospect",
    basin,
    latitude: 31.5,
    longitude: -103.5,
    hydrocarbon_type: gas ? "gas" : "oil",
    resource_estimate: {
      p90: resource * 0.7,
      p50: resource,
      p10: resource * 1.4,
      distribution_type: "lognormal",
      unit: gas ? "BCF" : b.eur_mmboe ? "MMBOE" : "MBOE",
    },
    recovery_factor: distribution(1, 0),
    well_cost: distribution(well),
    completion_cost: distribution(well * 0.25),
    facility_cost: mid("facility_cost_musd", 0) * 1e6,
    opex_per_boe: distribution(mid(gas ? "opex_per_mcf" : "opex_per_boe", 10)),
    royalty_rate: mid("royalty", 0.22),
    tax_rate: 0.25,
    working_interest: 1,
    net_revenue_interest: null,
    decline_params: {
      initial_production_rate:
        mid(gas ? "ip_mmcf_day" : "ip_boe_day", 1200) * (gas ? 1000 : 1),
      initial_decline_rate: mid("decline_rate", 0.65),
      b_factor: mid("b_factor", 1),
      terminal_decline_rate: 0.08,
      well_life_years: 30,
    },
    water_depth_ft: null,
    infrastructure_distance_miles: null,
    lease_expiry_years: null,
    notes: null,
    oil_fraction: 1,
    assumption_source:
      "Illustrative repository basin benchmark; unverified. EUR treated as recoverable (recovery=1). Completion assumed at 25% of drilling. All costs USD; Montney uses generic USD fallback.",
  };
}
export function newScenario(
  name = "Base case",
  oil = 75,
  gas = 3.25,
): CommodityPriceScenario {
  return {
    scenario_name: name,
    oil_price_deck: Array.from({ length: 30 }, (_, i) => ({
      year: i + 1,
      price_per_unit: oil,
    })),
    gas_price_deck: Array.from({ length: 30 }, (_, i) => ({
      year: i + 1,
      price_per_unit: gas,
    })),
    ngl_price_deck: null,
    price_volatility: 0.2,
    price_correlation_oil_gas: 0.5,
  };
}
export function newPortfolio(): PortfolioInput {
  return {
    name: "Untitled portfolio",
    prospects: [newProspect()],
    decisions: null,
    capital_budget: 50000000,
    discount_rate: 0.1,
    simulation_iterations: 1000,
    random_seed: 42,
    risk_aversion: 1,
    price_scenarios: [newScenario()],
    constraints: {
      min_prospects_drilled: null,
      max_prospects_drilled: null,
      mandatory_drill: [],
      mandatory_defer: [],
      max_single_prospect_pct_of_budget: null,
      min_basin_allocation: {},
      fixed_decisions: {},
    },
  };
}
