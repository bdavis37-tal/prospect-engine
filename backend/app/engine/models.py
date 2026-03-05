from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, model_validator


class Basin(str, Enum):
    PERMIAN_DELAWARE = "permian_delaware"
    PERMIAN_MIDLAND = "permian_midland"
    EAGLE_FORD_OIL = "eagle_ford_oil"
    EAGLE_FORD_GAS = "eagle_ford_gas"
    BAKKEN = "bakken"
    DJ_NIOBRARA = "dj_niobrara"
    GOM_SHELF = "gom_shelf"
    GOM_DEEPWATER = "gom_deepwater"
    MARCELLUS_UTICA = "marcellus_utica"
    HAYNESVILLE = "haynesville"
    SCOOP_STACK = "scoop_stack"
    POWDER_RIVER = "powder_river"
    MONTNEY = "montney"
    GENERIC_ONSHORE_US = "generic_onshore_us"


class HydrocarbonType(str, Enum):
    OIL = "oil"
    GAS = "gas"
    CONDENSATE = "condensate"
    MIXED = "mixed"


class DecisionType(str, Enum):
    DRILL = "drill"
    FARM_OUT = "farm_out"
    DIVEST = "divest"
    DEFER = "defer"


class DistributionParams(BaseModel):
    base: float
    low: float
    high: float
    distribution_type: str = "triangular"


class ResourceDistribution(BaseModel):
    p10: float
    p50: float
    p90: float
    distribution_type: str = "lognormal"
    unit: str = "MBOE"


class DeclineParameters(BaseModel):
    initial_production_rate: float
    initial_decline_rate: float
    b_factor: float = 1.0
    terminal_decline_rate: float = 0.08
    well_life_years: int = 30


class Prospect(BaseModel):
    prospect_id: str
    name: str
    latitude: float
    longitude: float
    basin: Basin
    hydrocarbon_type: HydrocarbonType
    water_depth_ft: Optional[float] = None
    resource_estimate: ResourceDistribution
    recovery_factor: DistributionParams
    well_cost: DistributionParams
    completion_cost: DistributionParams
    facility_cost: float = 0.0
    opex_per_boe: DistributionParams
    royalty_rate: float = 0.22
    tax_rate: float = 0.25
    working_interest: float = 1.0
    net_revenue_interest: Optional[float] = None
    decline_params: DeclineParameters
    infrastructure_distance_miles: Optional[float] = None
    lease_expiry_years: Optional[float] = None
    notes: Optional[str] = None

    @model_validator(mode="after")
    def compute_nri(self) -> "Prospect":
        if self.net_revenue_interest is None:
            self.net_revenue_interest = self.working_interest * (1.0 - self.royalty_rate)
        return self


class AnnualPrice(BaseModel):
    year: int
    price_per_unit: float


class CommodityPriceScenario(BaseModel):
    scenario_name: str
    oil_price_deck: list[AnnualPrice]
    gas_price_deck: list[AnnualPrice]
    ngl_price_deck: Optional[list[AnnualPrice]] = None
    price_volatility: float = 0.2
    price_correlation_oil_gas: float = 0.5


class DecisionOption(BaseModel):
    decision_type: DecisionType
    partner_carry_pct: Optional[float] = None
    retained_working_interest: Optional[float] = None
    promoted_interest: Optional[float] = None
    expected_sale_price: Optional[float] = None
    probability_of_closing: Optional[float] = None
    holding_cost_per_year: Optional[float] = None
    lease_expiry_risk: Optional[bool] = None


class PortfolioConstraints(BaseModel):
    min_prospects_drilled: Optional[int] = None
    max_prospects_drilled: Optional[int] = None
    mandatory_drill: Optional[list[str]] = None
    mandatory_defer: Optional[list[str]] = None
    max_single_prospect_pct_of_budget: Optional[float] = None
    min_basin_allocation: Optional[dict[str, float]] = None


class PortfolioInput(BaseModel):
    prospects: list[Prospect]
    decisions: Optional[dict[str, DecisionOption]] = None
    capital_budget: float
    discount_rate: float = 0.10
    simulation_iterations: int = 10_000
    price_scenarios: list[CommodityPriceScenario]
    constraints: PortfolioConstraints = Field(default_factory=PortfolioConstraints)


class DistributionSummary(BaseModel):
    mean: float
    std: float
    p10: float
    p50: float
    p90: float
    min: float
    max: float


class BinData(BaseModel):
    bin_start: float
    bin_end: float
    frequency: int


class ProspectEconomics(BaseModel):
    annual_production: list[float]
    annual_revenue: list[float]
    annual_cash_flows: list[float]
    capital_investment: float
    npv: float
    irr: Optional[float]
    payout_period_years: Optional[float]
    capital_efficiency: float
    profitability_index: float


class SimulationResult(BaseModel):
    prospect_id: str
    n_iterations: int
    npv_distribution: DistributionSummary
    irr_distribution: DistributionSummary
    payout_distribution: DistributionSummary
    probability_positive_npv: float
    expected_npv: float
    expected_irr: float
    npv_histogram_data: list[BinData]
    irr_histogram_data: list[BinData]
    capital_at_risk: float
    risk_reward_ratio: float
    annual_cash_flows_p10: list[float]
    annual_cash_flows_p50: list[float]
    annual_cash_flows_p90: list[float]
    sample_npvs: list[float]


class DecisionMetrics(BaseModel):
    decision_type: DecisionType
    expected_npv: float
    capital_required: float
    probability_positive_npv: float
    capital_efficiency: float


class DecisionComparison(BaseModel):
    prospect_id: str
    options: dict[DecisionType, DecisionMetrics]
    recommendation: DecisionType


class FrontierPoint(BaseModel):
    expected_npv: float
    portfolio_risk: float
    allocation: dict[str, DecisionType]
    capital_deployed: float
    capital_remaining: float


class PortfolioOptimizationResult(BaseModel):
    efficient_frontier: list[FrontierPoint]
    recommended_portfolio: FrontierPoint
    current_portfolio: Optional[FrontierPoint] = None
    prospect_robustness: dict[str, dict[str, DecisionType]]
    total_portfolio_npv_distribution: DistributionSummary
    diversification_benefit: float


class ScenarioResult(BaseModel):
    scenario_name: str
    optimization_result: PortfolioOptimizationResult


class ScenarioComparison(BaseModel):
    scenario_results: list[ScenarioResult]
    robust_prospects: list[str]
    fragile_prospects: list[str]


class SensitivityItem(BaseModel):
    variable_name: str
    low_case_value: float
    low_case_npv: float
    high_case_value: float
    high_case_npv: float
    swing: float


class TornadoResult(BaseModel):
    base_case_npv: float
    sensitivities: list[SensitivityItem]