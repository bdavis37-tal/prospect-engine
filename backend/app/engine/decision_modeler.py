from __future__ import annotations
import numpy as np
from app.engine.models import CommodityPriceScenario, DecisionComparison, DecisionMetrics, DecisionOption, DecisionType, Prospect
from app.engine.monte_carlo import run_simulation

DEFAULT_FARMOUT_RETAINED_WI = 0.50
DEFAULT_FARMOUT_CARRY = 0.60
DEFAULT_DIVEST_CAPITAL_MULTIPLE = 0.08
DEFAULT_DIVEST_PROB = 0.60
DEFAULT_DIVEST_TRANSACTION_COST = 500_000
DEFAULT_DEFER_COST = 500_000
DEFAULT_DEFER_COST_EXPIRING = 2_000_000


def simulate_decisions(prospect: Prospect, scenarios: list[CommodityPriceScenario], n_iterations: int,
                       discount_rate: float, decision_option: DecisionOption | None = None,
                       random_seed: int = 42, price_seed: int = 43):
    """Matched draws across alternatives. Retained WI is a fraction of original WI.

    Carry is the partner-paid fraction of retained drilling/completion capital;
    facilities are not carried. Divest pays transaction costs even on failure.
    Defer has one year of holding cost and no assumed future option value.
    """
    def option(name, default):
        value = getattr(decision_option, name, None)
        return default if value is None else value

    drill = run_simulation(prospect, scenarios, n_iterations, discount_rate, random_seed, price_seed)
    farm_prospect = prospect.model_copy(deep=True)
    retained = option('retained_working_interest', DEFAULT_FARMOUT_RETAINED_WI)
    farm_prospect.working_interest *= retained
    farm_prospect.net_revenue_interest = float(prospect.net_revenue_interest) * retained
    carry = option('partner_carry_pct', DEFAULT_FARMOUT_CARRY)
    for cost in [farm_prospect.well_cost, farm_prospect.completion_cost]:
        cost.low *= 1 - carry
        cost.base *= 1 - carry
        cost.high *= 1 - carry
    farm = run_simulation(farm_prospect, scenarios, n_iterations, discount_rate, random_seed, price_seed)
    sale = option('expected_sale_price', drill.capital_at_risk * DEFAULT_DIVEST_CAPITAL_MULTIPLE)
    closing = option('probability_of_closing', DEFAULT_DIVEST_PROB)
    rng = np.random.default_rng(np.random.SeedSequence([random_seed, 812]))
    divest = (rng.random(n_iterations) < closing) * sale - DEFAULT_DIVEST_TRANSACTION_COST
    hold = option('holding_cost_per_year', DEFAULT_DEFER_COST_EXPIRING if prospect.lease_expiry_years is not None and prospect.lease_expiry_years < 1.5 else DEFAULT_DEFER_COST)
    samples = {DecisionType.DRILL: np.array(drill.sample_npvs), DecisionType.FARM_OUT: np.array(farm.sample_npvs),
               DecisionType.DIVEST: divest, DecisionType.DEFER: np.full(n_iterations, -hold / (1 + discount_rate))}
    capital = {DecisionType.DRILL: drill.capital_at_risk, DecisionType.FARM_OUT: farm.capital_at_risk,
               DecisionType.DIVEST: DEFAULT_DIVEST_TRANSACTION_COST, DecisionType.DEFER: hold}
    options = {d: DecisionMetrics(decision_type=d, expected_npv=float(np.mean(values)), capital_required=capital[d],
                                 probability_positive_npv=float(np.mean(values > 0)),
                                 capital_efficiency=float(np.mean(values)) / max(capital[d], 1)) for d, values in samples.items()}
    recommendation = max(options, key=lambda d: options[d].expected_npv - float(np.maximum(-samples[d], 0).mean()))
    return DecisionComparison(prospect_id=prospect.prospect_id, options=options, recommendation=recommendation), samples, drill


def compare_decisions(prospect: Prospect, scenarios: list[CommodityPriceScenario], n_iterations: int,
                      discount_rate: float, decision_option: DecisionOption | None = None) -> DecisionComparison:
    return simulate_decisions(prospect, scenarios, n_iterations, discount_rate, decision_option)[0]
