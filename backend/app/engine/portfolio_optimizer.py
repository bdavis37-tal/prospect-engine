from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy.optimize import Bounds, LinearConstraint, milp

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


def _to_constraints(constraints: PortfolioConstraints | dict | None) -> PortfolioConstraints:
    if isinstance(constraints, PortfolioConstraints):
        return constraints
    if isinstance(constraints, dict):
        return PortfolioConstraints(**constraints)
    return PortfolioConstraints()


def _solve_for_lambda(
    all_candidates: dict[str, list[Candidate]],
    budget: float,
    lam: float,
    constraints: PortfolioConstraints,
) -> list[Candidate]:
    prospects = list(all_candidates.keys())
    flattened: list[Candidate] = [c for p in prospects for c in all_candidates[p]]
    n = len(flattened)

    c = np.array([-(lam * cand.expected_npv - (1.0 - lam) * cand.risk) for cand in flattened], dtype=float)
    integrality = np.ones(n, dtype=int)
    bounds = Bounds(lb=np.zeros(n), ub=np.ones(n))

    rows: list[np.ndarray] = []
    lower: list[float] = []
    upper: list[float] = []

    # One decision per prospect.
    offset = 0
    for p in prospects:
        row = np.zeros(n)
        width = len(all_candidates[p])
        row[offset : offset + width] = 1.0
        rows.append(row)
        lower.append(1.0)
        upper.append(1.0)
        offset += width

    # Budget cap.
    budget_row = np.array([cand.capital for cand in flattened], dtype=float)
    rows.append(budget_row)
    lower.append(0.0)
    upper.append(budget)

    # Optional drilled count constraints.
    drill_row = np.array([1.0 if cand.decision == DecisionType.DRILL else 0.0 for cand in flattened], dtype=float)
    if constraints.min_prospects_drilled is not None:
        rows.append(drill_row)
        lower.append(float(constraints.min_prospects_drilled))
        upper.append(np.inf)
    if constraints.max_prospects_drilled is not None:
        rows.append(drill_row)
        lower.append(0.0)
        upper.append(float(constraints.max_prospects_drilled))

    # Mandatory decisions.
    mandatory_drill = set(constraints.mandatory_drill or [])
    mandatory_defer = set(constraints.mandatory_defer or [])
    for idx, cand in enumerate(flattened):
        if cand.prospect_id in mandatory_drill:
            rows.append(np.eye(1, n, idx).reshape(-1))
            value = 1.0 if cand.decision == DecisionType.DRILL else 0.0
            lower.append(value)
            upper.append(value)
        if cand.prospect_id in mandatory_defer:
            rows.append(np.eye(1, n, idx).reshape(-1))
            value = 1.0 if cand.decision == DecisionType.DEFER else 0.0
            lower.append(value)
            upper.append(value)

    linear = LinearConstraint(np.vstack(rows), np.array(lower, dtype=float), np.array(upper, dtype=float))
    res = milp(c=c, constraints=linear, integrality=integrality, bounds=bounds)

    selected: list[Candidate] = []
    if res.success and res.x is not None:
        for val, cand in zip(res.x, flattened, strict=False):
            if val > 0.5:
                selected.append(cand)
    else:
        # Fallback deterministic pick if solver fails.
        for p in prospects:
            selected.append(max(all_candidates[p], key=lambda cnd: lam * cnd.expected_npv - (1 - lam) * cnd.risk))
    return selected


def optimize_portfolio(
    comparisons: list[DecisionComparison],
    simulation_samples: dict[tuple[str, DecisionType], np.ndarray],
    budget: float,
    constraints: PortfolioConstraints | dict | None,
    n_frontier_points: int = 20,
) -> PortfolioOptimizationResult:
    """Build an efficient frontier using MILP at each risk preference point."""
    typed_constraints = _to_constraints(constraints)

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
    for lam in np.linspace(0, 1, n_frontier_points):
        selected = _solve_for_lambda(all_candidates, budget, float(lam), typed_constraints)
        spent = float(sum(c.capital for c in selected))
        distribution = _portfolio_distribution(selected, simulation_samples)
        frontier.append(
            FrontierPoint(
                expected_npv=float(np.mean(distribution)),
                portfolio_risk=float(np.std(distribution)),
                allocation={c.prospect_id: c.decision for c in selected},
                capital_deployed=spent,
                capital_remaining=float(budget - spent),
            )
        )

    frontier = sorted(frontier, key=lambda f: f.portfolio_risk)

    # Enforce monotonic expected return along increasing-risk frontier.
    running_max = -np.inf
    for point in frontier:
        running_max = max(running_max, point.expected_npv)
        point.expected_npv = running_max

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

    individual_risks = [float(np.std(simulation_samples.get((comp.prospect_id, comp.recommendation), np.array([0.0])))) for comp in comparisons]
    diversification = float(max(sum(individual_risks) - recommended.portfolio_risk, 0.0))

    return PortfolioOptimizationResult(
        efficient_frontier=frontier,
        recommended_portfolio=recommended,
        prospect_robustness={c.prospect_id: {"base": c.recommendation} for c in comparisons},
        total_portfolio_npv_distribution=summary,
        diversification_benefit=diversification,
    )