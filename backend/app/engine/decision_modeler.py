from __future__ import annotations

from app.engine.models import DecisionComparison, DecisionMetrics, DecisionType, Prospect
from app.engine.monte_carlo import run_simulation


def compare_decisions(prospect: Prospect, scenarios, n_iterations: int, discount_rate: float) -> DecisionComparison:
    """Compare drill/farm-out/divest/defer outcomes for a prospect."""
    drill = run_simulation(prospect, scenarios, n_iterations=n_iterations, discount_rate=discount_rate)

    farm_prospect = prospect.model_copy(deep=True)
    retained_wi = 0.75
    carry = 0.5
    farm_prospect.working_interest = retained_wi
    farm_prospect.net_revenue_interest = retained_wi * (1 - farm_prospect.royalty_rate)
    farm_prospect.well_cost.base *= carry
    farm_prospect.well_cost.low *= carry
    farm_prospect.well_cost.high *= carry
    farm_prospect.completion_cost.base *= carry
    farm_prospect.completion_cost.low *= carry
    farm_prospect.completion_cost.high *= carry
    farm = run_simulation(farm_prospect, scenarios, n_iterations=n_iterations, discount_rate=discount_rate)

    divest_value = 0.30 * drill.expected_npv
    divest_prob = 0.8
    defer_cost = (prospect.lease_expiry_years is not None and prospect.lease_expiry_years < 1.5) and 2_000_000 or 500_000

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
            expected_npv=divest_value * divest_prob,
            capital_required=0.0,
            probability_positive_npv=divest_prob,
            capital_efficiency=0.0,
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