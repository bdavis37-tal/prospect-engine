from __future__ import annotations

import numpy as np

from app.engine.decision_modeler import compare_decisions
from app.engine.models import DecisionType, PortfolioInput, ScenarioComparison, ScenarioResult
from app.engine.monte_carlo import run_simulation
from app.engine.portfolio_optimizer import optimize_portfolio


def compare_scenarios(portfolio: PortfolioInput, scenarios) -> ScenarioComparison:
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

            drill = run_simulation(prospect, [scenario], portfolio.simulation_iterations, portfolio.discount_rate)
            sample_map[(prospect.prospect_id, DecisionType.DRILL)] = np.array(drill.sample_npvs)
            sample_map[(prospect.prospect_id, DecisionType.FARM_OUT)] = np.array(drill.sample_npvs) * 0.75
            sale = comp.options[DecisionType.DIVEST].expected_npv
            sample_map[(prospect.prospect_id, DecisionType.DIVEST)] = np.full(portfolio.simulation_iterations, sale)
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