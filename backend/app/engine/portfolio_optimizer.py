from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from app.engine.models import (
    DecisionComparison,
    DecisionType,
    DistributionSummary,
    FrontierPoint,
    PortfolioConstraints,
    PortfolioOptimizationResult,
)


@dataclass
class Candidate:
    prospect_id: str
    decision: DecisionType
    expected_npv: float
    risk: float
    capital: float


def _portfolio_distribution(selected: list[Candidate], sample_map: dict[tuple[str, DecisionType], np.ndarray]) -> np.ndarray:
    if not selected:
        return np.array([0.0])
    stacked = np.vstack([sample_map[(c.prospect_id, c.decision)] for c in selected])
    return np.sum(stacked, axis=0)


def optimize_portfolio(
    comparisons: list[DecisionComparison],
    simulation_samples: dict[tuple[str, DecisionType], np.ndarray],
    budget: float,
    constraints: PortfolioConstraints,
    n_frontier_points: int = 20,
) -> PortfolioOptimizationResult:
    """Approximate efficient frontier via weighted score selection."""
    all_candidates: dict[str, list[Candidate]] = {}
    for comp in comparisons:
        bucket: list[Candidate] = []
        for decision, metric in comp.options.items():
            sample = simulation_samples.get((comp.prospect_id, decision), np.array([metric.expected_npv]))
            bucket.append(
                Candidate(
                    prospect_id=comp.prospect_id,
                    decision=decision,
                    expected_npv=metric.expected_npv,
                    risk=float(np.std(sample)),
                    capital=metric.capital_required,
                )
            )
        all_candidates[comp.prospect_id] = bucket

    frontier: list[FrontierPoint] = []
    lambdas = np.linspace(0, 1, n_frontier_points)

    for lam in lambdas:
        selected: list[Candidate] = []
        spent = 0.0
        for prospect_id, options in all_candidates.items():
            ranked = sorted(options, key=lambda c: (lam * c.expected_npv - (1 - lam) * c.risk), reverse=True)
            pick = ranked[0]
            if spent + pick.capital > budget:
                affordable = [c for c in ranked if spent + c.capital <= budget]
                pick = affordable[0] if affordable else min(ranked, key=lambda c: c.capital)
            selected.append(pick)
            spent += pick.capital

        distribution = _portfolio_distribution(selected, simulation_samples)
        frontier.append(
            FrontierPoint(
                expected_npv=float(np.mean(distribution)),
                portfolio_risk=float(np.std(distribution)),
                allocation={c.prospect_id: c.decision for c in selected},
                capital_deployed=float(spent),
                capital_remaining=float(budget - spent),
            )
        )

    frontier = sorted(frontier, key=lambda f: f.portfolio_risk)
    recommended = max(frontier, key=lambda f: f.expected_npv / max(f.portfolio_risk, 1e-9))
    dist = np.array([p.expected_npv for p in frontier], dtype=float)
    summary = DistributionSummary(
        mean=float(np.mean(dist)),
        std=float(np.std(dist)),
        p10=float(np.percentile(dist, 90)),
        p50=float(np.percentile(dist, 50)),
        p90=float(np.percentile(dist, 10)),
        min=float(np.min(dist)),
        max=float(np.max(dist)),
    )
    diversification = float(sum(np.sqrt(c.expected_npv**2) for opts in all_candidates.values() for c in opts[:1]) - recommended.portfolio_risk)

    return PortfolioOptimizationResult(
        efficient_frontier=frontier,
        recommended_portfolio=recommended,
        prospect_robustness={c.prospect_id: {"base": c.recommendation} for c in comparisons},
        total_portfolio_npv_distribution=summary,
        diversification_benefit=diversification,
    )