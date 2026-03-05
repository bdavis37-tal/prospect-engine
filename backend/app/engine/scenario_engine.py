from __future__ import annotations

import numpy as np

from app.engine.decision_modeler import compare_decisions
from app.engine.models import CommodityPriceScenario, DecisionType, PortfolioInput, ScenarioComparison, ScenarioResult
from app.engine.monte_carlo import run_simulation
from app.engine.portfolio_optimizer import optimize_portfolio


def compare_scenarios(portfolio: PortfolioInput, scenarios: list[CommodityPriceScenario]) -> ScenarioComparison:
    """Run decision and optimization pipeline across scenarios."""
    scenario_results: list[ScenarioResult] = []
    robustness: dict[str, list[DecisionType]] = {p.prospect_id: [] for p in portfolio.prospects}

    for scenario in scenarios:
        comparisons = []
        sample_map: dict[tuple[str, DecisionType], np.ndarray] = {}

        for prospect in portfolio.prospects:
            comp = compare_decisions(
                prospect,
                [scenario],
                n_iterations=portfolio.simulation_iterations,
                discount_rate=portfolio.discount_rate,
            )
            comparisons.append(comp)
            robustness[prospect.prospect_id].append(comp.recommendation)

            rng = np.random.default_rng(42)
            drill = run_simulation(prospect, [scenario], portfolio.simulation_iterations, portfolio.discount_rate)
            drill_samples = np.array(drill.sample_npvs)
            sample_map[(prospect.prospect_id, DecisionType.DRILL)] = drill_samples
            farm_ratio = comp.options[DecisionType.FARM_OUT].expected_npv / max(abs(drill.expected_npv), 1e-9)
            sample_map[(prospect.prospect_id, DecisionType.FARM_OUT)] = drill_samples * farm_ratio
            # Divest: model deal risk — probability of closing × sale value with noise
            sale = comp.options[DecisionType.DIVEST].expected_npv
            divest_prob = comp.options[DecisionType.DIVEST].probability_positive_npv
            closes = rng.random(portfolio.simulation_iterations) < divest_prob
            noise = rng.normal(1.0, 0.15, portfolio.simulation_iterations)
            divest_samples = np.where(closes, sale / max(divest_prob, 0.01) * noise, 0.0)
            sample_map[(prospect.prospect_id, DecisionType.DIVEST)] = divest_samples
            sample_map[(prospect.prospect_id, DecisionType.DEFER)] = np.zeros(portfolio.simulation_iterations)

        optimized = optimize_portfolio(
            comparisons,
            sample_map,
            budget=portfolio.capital_budget,
            constraints=portfolio.constraints,
        )
        scenario_results.append(ScenarioResult(scenario_name=scenario.scenario_name, optimization_result=optimized))

    robust = [pid for pid, decisions in robustness.items() if len(set(decisions)) == 1]
    fragile = [pid for pid, decisions in robustness.items() if len(set(decisions)) > 1]
    return ScenarioComparison(scenario_results=scenario_results, robust_prospects=robust, fragile_prospects=fragile)