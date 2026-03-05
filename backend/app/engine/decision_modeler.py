from __future__ import annotations

from app.engine.models import (
    CommodityPriceScenario,
    DecisionComparison,
    DecisionMetrics,
    DecisionOption,
    DecisionType,
    Prospect,
)
from app.engine.monte_carlo import run_simulation

# Default decision parameters (used when no prospect-specific options are provided)
DEFAULT_FARMOUT_RETAINED_WI = 0.50
DEFAULT_FARMOUT_CARRY = 0.60
DEFAULT_DIVEST_CAPITAL_MULTIPLE = 0.08
DEFAULT_DIVEST_PROB = 0.60
DEFAULT_DIVEST_TRANSACTION_COST = 500_000
DEFAULT_DEFER_COST = 500_000
DEFAULT_DEFER_COST_EXPIRING = 2_000_000


def compare_decisions(
    prospect: Prospect,
    scenarios: list[CommodityPriceScenario],
    n_iterations: int,
    discount_rate: float,
    decision_option: DecisionOption | None = None,
) -> DecisionComparison:
    """Compare drill/farm-out/divest/defer outcomes for a prospect."""
    drill = run_simulation(prospect, scenarios, n_iterations=n_iterations, discount_rate=discount_rate)

    # Farm-out: partner carries a portion of well costs in exchange for WI
    retained_wi = (decision_option and decision_option.retained_working_interest) or DEFAULT_FARMOUT_RETAINED_WI
    carry = (decision_option and decision_option.partner_carry_pct) or DEFAULT_FARMOUT_CARRY
    farm_prospect = prospect.model_copy(deep=True)
    farm_prospect.working_interest = retained_wi
    farm_prospect.net_revenue_interest = retained_wi * (1 - farm_prospect.royalty_rate)
    farm_prospect.well_cost.base *= carry
    farm_prospect.well_cost.low *= carry
    farm_prospect.well_cost.high *= carry
    farm_prospect.completion_cost.base *= carry
    farm_prospect.completion_cost.low *= carry
    farm_prospect.completion_cost.high *= carry
    farm = run_simulation(farm_prospect, scenarios, n_iterations=n_iterations, discount_rate=discount_rate)

    # Divest: sell the prospect for a fraction of capital value
    if decision_option and decision_option.expected_sale_price is not None:
        divest_value = decision_option.expected_sale_price
    else:
        divest_value = max(drill.capital_at_risk * DEFAULT_DIVEST_CAPITAL_MULTIPLE, 0.0)
    divest_prob = (decision_option and decision_option.probability_of_closing) or DEFAULT_DIVEST_PROB

    # Defer: hold the lease with annual cost
    if prospect.lease_expiry_years is not None and prospect.lease_expiry_years < 1.5:
        defer_cost = DEFAULT_DEFER_COST_EXPIRING
    else:
        defer_cost = DEFAULT_DEFER_COST

    options = {
        DecisionType.DRILL: DecisionMetrics(
            decision_type=DecisionType.DRILL,
            expected_npv=drill.expected_npv,
            capital_required=drill.capital_at_risk,
            probability_positive_npv=drill.probability_positive_npv,
            capital_efficiency=drill.expected_npv / max(drill.capital_at_risk, 1e-9),
        ),
        DecisionType.FARM_OUT: DecisionMetrics(
            decision_type=DecisionType.FARM_OUT,
            expected_npv=farm.expected_npv,
            capital_required=farm.capital_at_risk,
            probability_positive_npv=farm.probability_positive_npv,
            capital_efficiency=farm.expected_npv / max(farm.capital_at_risk, 1e-9),
        ),
        DecisionType.DIVEST: DecisionMetrics(
            decision_type=DecisionType.DIVEST,
            expected_npv=divest_value * divest_prob - DEFAULT_DIVEST_TRANSACTION_COST,
            capital_required=DEFAULT_DIVEST_TRANSACTION_COST,
            probability_positive_npv=divest_prob if divest_value > 0 else 0.0,
            capital_efficiency=(divest_value * divest_prob - DEFAULT_DIVEST_TRANSACTION_COST) / DEFAULT_DIVEST_TRANSACTION_COST,
        ),
        DecisionType.DEFER: DecisionMetrics(
            decision_type=DecisionType.DEFER,
            expected_npv=0.0,
            capital_required=defer_cost,
            probability_positive_npv=0.5,
            capital_efficiency=0.0,
        ),
    }

    recommendation = max(options.values(), key=lambda d: d.expected_npv - 0.3 * d.capital_required).decision_type
    return DecisionComparison(prospect_id=prospect.prospect_id, options=options, recommendation=recommendation)