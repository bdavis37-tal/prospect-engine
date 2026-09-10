from __future__ import annotations

from enum import Enum
from typing import Optional, Literal

from pydantic import BaseModel as PydanticModel, ConfigDict, Field, model_validator


class BaseModel(PydanticModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


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
    base: float = Field(ge=0, le=1e12)
    low: float = Field(ge=0, le=1e12)
    high: float = Field(ge=0, le=1e12)
    distribution_type: Literal["triangular", "lognormal"] = "triangular"

    @model_validator(mode="after")
    def ordered(self):
        if not self.low <= self.base <= self.high:
            raise ValueError("Distribution must satisfy low <= base <= high")
        if self.distribution_type == "lognormal" and self.low <= 0:
            raise ValueError("Lognormal bounds must be positive")
        return self


class ResourceDistribution(BaseModel):
    p10: float = Field(gt=0, le=1e9)
    p50: float = Field(gt=0, le=1e9)
    p90: float = Field(gt=0, le=1e9)
    distribution_type: Literal["lognormal"] = "lognormal"
    unit: Literal["MBOE", "MMBOE", "MBO", "MMBO", "BOE", "BO", "MCF", "BCF"] = "MBOE"

    @model_validator(mode="after")
    def ordered(self):
        if not self.p10 >= self.p50 >= self.p90:
            raise ValueError("Exceedance estimates must satisfy P10 >= P50 >= P90")
        return self


class DeclineParameters(BaseModel):
    initial_production_rate: float = Field(gt=0, le=1e7)
    initial_decline_rate: float = Field(gt=0, lt=1)
    b_factor: float = Field(default=1.0, ge=0, le=2)
    terminal_decline_rate: float = Field(default=0.08, gt=0, lt=1)
    well_life_years: int = Field(default=30, ge=1, le=50)


class Prospect(BaseModel):
    prospect_id: str = Field(min_length=1, max_length=80, pattern=r"^[A-Za-z0-9_-]+$")
    name: str = Field(min_length=1, max_length=120)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    basin: Basin
    hydrocarbon_type: HydrocarbonType
    water_depth_ft: Optional[float] = Field(default=None, ge=0, le=50000)
    resource_estimate: ResourceDistribution
    recovery_factor: DistributionParams
    well_cost: DistributionParams
    completion_cost: DistributionParams
    facility_cost: float = Field(default=0.0, ge=0, le=1e12)
    opex_per_boe: DistributionParams
    royalty_rate: float = Field(default=0.22, ge=0, le=1)
    tax_rate: float = Field(default=0.25, ge=0, le=1)
    working_interest: float = Field(default=1.0, ge=0, le=1)
    net_revenue_interest: Optional[float] = Field(default=None, ge=0, le=1)
    decline_params: DeclineParameters
    infrastructure_distance_miles: Optional[float] = Field(default=None, ge=0, le=25000)
    lease_expiry_years: Optional[float] = Field(default=None, ge=0, le=100)
    notes: Optional[str] = Field(default=None, max_length=4000)
    assumption_source: str = Field(default="User supplied; not independently verified", max_length=500)
    oil_fraction: float = Field(default=1, ge=0, le=1)

    @model_validator(mode="after")
    def compute_nri(self) -> "Prospect":
        if self.net_revenue_interest is None:
            self.net_revenue_interest = self.working_interest * (1.0 - self.royalty_rate)
        if self.net_revenue_interest > self.working_interest:
            raise ValueError("Net revenue interest cannot exceed working interest")
        if self.recovery_factor.distribution_type == "lognormal" and self.recovery_factor.low != self.recovery_factor.high:
            raise ValueError("Recovery factors require a bounded triangular distribution or a fixed value")
        if self.recovery_factor.high > 1:
            raise ValueError("Recovery factor must be between 0 and 1")
        if self.decline_params.terminal_decline_rate > self.decline_params.initial_decline_rate:
            raise ValueError("Terminal decline cannot exceed initial decline")
        if self.resource_estimate.unit in {"MCF", "BCF"} and self.hydrocarbon_type != HydrocarbonType.GAS:
            raise ValueError("MCF/BCF resource units require gas hydrocarbon type")
        return self


class AnnualPrice(BaseModel):
    year: int = Field(ge=1, le=50)
    price_per_unit: float = Field(gt=0, le=10000)


class CommodityPriceScenario(BaseModel):
    scenario_name: str = Field(min_length=1, max_length=80)
    oil_price_deck: list[AnnualPrice] = Field(min_length=1, max_length=50)
    gas_price_deck: list[AnnualPrice] = Field(min_length=1, max_length=50)
    ngl_price_deck: Optional[list[AnnualPrice]] = None
    price_volatility: float = Field(default=0.2, ge=0, le=1)
    price_correlation_oil_gas: float = Field(default=0.5, ge=-1, le=1)


    @model_validator(mode="after")
    def decks(self):
        for deck in [self.oil_price_deck, self.gas_price_deck]:
            if [p.year for p in deck] != list(range(1, len(deck) + 1)):
                raise ValueError("Price deck years must start at 1 and be consecutive")
        if len(self.oil_price_deck) != len(self.gas_price_deck):
            raise ValueError("Oil and gas decks must have equal horizons")
        if self.ngl_price_deck is not None:
            raise ValueError("Separate NGL pricing is not implemented; use a blended liquids deck")
        return self


class DecisionOption(BaseModel):
    decision_type: DecisionType
    partner_carry_pct: Optional[float] = Field(default=None, ge=0, le=1)
    retained_working_interest: Optional[float] = Field(default=None, ge=0, le=1)
    promoted_interest: Optional[float] = None
    expected_sale_price: Optional[float] = Field(default=None, ge=0, le=1e12)
    probability_of_closing: Optional[float] = Field(default=None, ge=0, le=1)
    holding_cost_per_year: Optional[float] = Field(default=None, ge=0, le=1e12)
    lease_expiry_risk: Optional[bool] = None


    @model_validator(mode="after")
    def supported(self):
        if self.promoted_interest is not None or self.lease_expiry_risk is not None:
            raise ValueError("Promoted interests and lease-expiry options are not implemented")
        return self


class PortfolioConstraints(BaseModel):
    min_prospects_drilled: Optional[int] = Field(default=None, ge=0, le=40)
    max_prospects_drilled: Optional[int] = Field(default=None, ge=0, le=40)
    mandatory_drill: Optional[list[str]] = None
    mandatory_defer: Optional[list[str]] = None
    max_single_prospect_pct_of_budget: Optional[float] = Field(default=None, gt=0, le=1)
    min_basin_allocation: Optional[dict[Basin, float]] = None
    fixed_decisions: dict[str, DecisionType] = Field(default_factory=dict)

    @model_validator(mode="after")
    def consistent(self):
        if self.min_prospects_drilled is not None and self.max_prospects_drilled is not None and self.min_prospects_drilled > self.max_prospects_drilled:
            raise ValueError("Minimum drilled count exceeds maximum")
        if set(self.mandatory_drill or []) & set(self.mandatory_defer or []):
            raise ValueError("A prospect cannot be mandatory drill and defer")
        for ids, decision in [(self.mandatory_drill or [], DecisionType.DRILL), (self.mandatory_defer or [], DecisionType.DEFER)]:
            if any(pid in self.fixed_decisions and self.fixed_decisions[pid] != decision for pid in ids):
                raise ValueError("Fixed decision conflicts with a mandatory decision")
        values = list((self.min_basin_allocation or {}).values())
        if any(not 0 <= x <= 1 for x in values) or sum(values) > 1:
            raise ValueError("Basin minimums are fractions of total budget and must sum to at most 1")
        return self


class PortfolioInput(BaseModel):
    prospects: list[Prospect] = Field(min_length=1, max_length=40)
    decisions: Optional[dict[str, DecisionOption]] = None
    capital_budget: float = Field(gt=0, le=1e12)
    discount_rate: float = Field(default=0.10, ge=0, le=1)
    simulation_iterations: int = Field(default=2000, ge=100, le=10000)
    price_scenarios: list[CommodityPriceScenario] = Field(min_length=1, max_length=5)
    random_seed: int = Field(default=42, ge=0, le=2**32-1)
    risk_aversion: float = Field(default=1, ge=0, le=20)
    name: str = Field(default="Untitled portfolio", min_length=1, max_length=120)
    constraints: PortfolioConstraints = Field(default_factory=PortfolioConstraints)


    @model_validator(mode="after")
    def consistent(self):
        ids = [p.prospect_id for p in self.prospects]
        if len(ids) != len(set(ids)):
            raise ValueError("Prospect IDs must be unique")
        names = [s.scenario_name for s in self.price_scenarios]
        if len(names) != len(set(names)):
            raise ValueError("Scenario names must be unique")
        referenced = set(self.constraints.mandatory_drill or []) | set(self.constraints.mandatory_defer or []) | set(self.constraints.fixed_decisions) | set(self.decisions or {})
        if referenced - set(ids):
            raise ValueError("Constraint or decision refers to an unknown prospect")
        if (self.constraints.min_prospects_drilled or 0) > len(ids):
            raise ValueError("Minimum drilled count exceeds prospect count")
        horizon = max(p.decline_params.well_life_years for p in self.prospects)
        if any(len(s.oil_price_deck) < horizon for s in self.price_scenarios):
            raise ValueError("Each price deck must cover the longest prospect life")
        if len(ids) * self.simulation_iterations * horizon > 6_000_000:
            raise ValueError("Workload exceeds limit; reduce prospects, iterations or horizon")
        basins = {p.basin for p in self.prospects}
        if any(b not in basins and v > 0 for b,v in (self.constraints.min_basin_allocation or {}).items()):
            raise ValueError("Basin minimum refers to a basin with no prospects")
        return self


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
    irr_distribution: Optional[DistributionSummary]
    payout_distribution: Optional[DistributionSummary]
    probability_positive_npv: float
    expected_npv: float
    expected_irr: Optional[float]
    irr_defined_fraction: float
    probability_payout_within_life: float
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
    expected_loss: float = 0
    probability_of_loss: float = 0
    cvar90_loss: float = 0
    binding_constraints: list[str] = Field(default_factory=list)


class PortfolioOptimizationResult(BaseModel):
    efficient_frontier: list[FrontierPoint]
    recommended_portfolio: FrontierPoint
    current_portfolio: Optional[FrontierPoint] = None
    prospect_robustness: dict[str, dict[str, DecisionType]]
    total_portfolio_npv_distribution: DistributionSummary
    diversification_benefit: float
    risk_measure: str = "Expected loss: mean(max(-portfolio NPV, 0))"
    risk_aversion: float = 1
    solver_status: str = "optimal"


class ScenarioResult(BaseModel):
    scenario_name: str
    optimization_result: PortfolioOptimizationResult
    prospect_results: list[ProspectResult] = Field(default_factory=list)


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

class ProspectResult(BaseModel):
    prospect_id: str
    simulation: SimulationResult
    decision_comparison: DecisionComparison
    tornado: TornadoResult


class AnalysisResult(BaseModel):
    model_version: str = "2.0.0"
    input_hash: str
    generated_at: str
    input: PortfolioInput
    scenario_comparison: ScenarioComparison
    methodology: list[str]


ScenarioResult.model_rebuild()
ScenarioComparison.model_rebuild()
AnalysisResult.model_rebuild()
