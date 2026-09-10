from __future__ import annotations
from dataclasses import dataclass
import numpy as np
from scipy.optimize import Bounds, LinearConstraint, milp
from scipy.sparse import csc_matrix, eye, hstack, vstack
from app.engine.models import DecisionComparison, DecisionType, FrontierPoint, PortfolioConstraints, PortfolioOptimizationResult
from app.engine.monte_carlo import _summary


class OptimizationError(ValueError):
    def __init__(self, message: str, code: str = 'infeasible'):
        super().__init__(message)
        self.code = code


@dataclass
class Candidate:
    prospect_id: str
    decision: DecisionType
    expected_npv: float
    risk: float
    capital: float


def constraint_matrix(candidates, budget, constraints, basins):
    n = len(candidates)
    rows, lower, upper, names = [], [], [], []
    def add(row, lo, hi, name):
        rows.append(row); lower.append(lo); upper.append(hi); names.append(name)
    ids = {c.prospect_id for c in candidates}
    referenced = set(constraints.mandatory_drill or []) | set(constraints.mandatory_defer or []) | set(constraints.fixed_decisions)
    if referenced - ids:
        raise OptimizationError('Constraints reference unknown prospects', 'invalid_constraints')
    for pid in sorted(ids):
        add([float(c.prospect_id == pid) for c in candidates], 1, 1, f'One decision: {pid}')
    add([c.capital for c in candidates], 0, budget, 'Capital budget')
    if constraints.min_prospects_drilled is not None or constraints.max_prospects_drilled is not None:
        add([float(c.decision == DecisionType.DRILL) for c in candidates], constraints.min_prospects_drilled or 0,
            constraints.max_prospects_drilled if constraints.max_prospects_drilled is not None else len(ids), 'Drilled prospect count')
    fixed = dict(constraints.fixed_decisions)
    fixed.update({p: DecisionType.DRILL for p in constraints.mandatory_drill or []})
    fixed.update({p: DecisionType.DEFER for p in constraints.mandatory_defer or []})
    for pid, decision in fixed.items():
        add([float(c.prospect_id == pid and c.decision == decision) for c in candidates], 1, 1, f'Required {decision.value}: {pid}')
    if constraints.max_single_prospect_pct_of_budget is not None:
        for pid in sorted(ids):
            add([c.capital if c.prospect_id == pid else 0 for c in candidates], 0,
                budget * constraints.max_single_prospect_pct_of_budget, f'Concentration: {pid}')
    for basin, fraction in (constraints.min_basin_allocation or {}).items():
        add([c.capital if basins.get(c.prospect_id) == basin else 0 for c in candidates], budget * fraction, np.inf,
            f'Minimum basin capital: {basin.value}')
    return np.array(rows).reshape(-1, n), np.array(lower), np.array(upper), names


def solve(candidates, sample_matrix, budget, penalty, constraints, basins):
    """Maximize E[NPV] - penalty E[max(-portfolio NPV, 0)] over all supplied draws."""
    n, draws = len(candidates), sample_matrix.shape[0]
    a, lo, hi, names = constraint_matrix(candidates, budget, constraints, basins)
    scale = max(budget, float(np.abs(sample_matrix).mean()), 1)
    row_scale = np.maximum(np.abs(a).max(axis=1), 1)
    base = hstack([csc_matrix(a / row_scale[:, None]), csc_matrix((len(a), draws))])
    loss = hstack([csc_matrix(-sample_matrix / scale), -eye(draws, format='csc')])
    matrix = vstack([base, loss], format='csc')
    objective = np.r_[-sample_matrix.mean(axis=0) / scale, np.full(draws, penalty / draws)]
    res = milp(c=objective, integrality=np.r_[np.ones(n), np.zeros(draws)],
               bounds=Bounds(np.zeros(n + draws), np.r_[np.ones(n), np.full(draws, np.inf)]),
               constraints=LinearConstraint(matrix, np.r_[lo / row_scale, np.full(draws, -np.inf)],
                                            np.r_[hi / row_scale, np.zeros(draws)]),
               options={'time_limit': 20, 'mip_rel_gap': 0.0001})
    if not res.success or res.x is None:
        code = 'timeout' if res.status == 1 else 'infeasible' if res.status == 2 else 'solver_failed'
        raise OptimizationError('No verified allocation. Check the budget, mandatory decisions, concentration and basin minimums.' if code == 'infeasible' else 'Optimization did not finish within the solver limit; reduce the workload or retry.', code)
    chosen = np.rint(res.x[:n])
    tolerance = 1e-7 * np.maximum(np.maximum(np.abs(a).sum(axis=1), np.abs(lo)), 1)
    actual = a @ chosen
    if np.any(actual < lo - tolerance) or np.any(actual > hi + tolerance):
        raise OptimizationError('Solver allocation failed independent feasibility verification', 'solver_failed')
    selected = [c for c, x in zip(candidates, chosen) if x > .5]
    binding = [name for value, low, high, tol, name in zip(actual, lo, hi, tolerance, names)
               if not name.startswith('One decision') and (abs(value - low) <= tol or abs(value - high) <= tol)]
    return selected, sample_matrix @ chosen, binding


def optimize_portfolio(comparisons: list[DecisionComparison], simulation_samples: dict,
                       budget: float, constraints: PortfolioConstraints | dict | None,
                       n_frontier_points: int = 7, basins: dict | None = None,
                       risk_aversion: float = 1) -> PortfolioOptimizationResult:
    typed = constraints if isinstance(constraints, PortfolioConstraints) else PortfolioConstraints(**(constraints or {}))
    if not comparisons or budget <= 0:
        raise OptimizationError('A positive budget and at least one prospect are required', 'invalid_input')
    candidates, samples = [], []
    for comp in comparisons:
        for decision, metric in comp.options.items():
            sample = np.asarray(simulation_samples[(comp.prospect_id, decision)], dtype=float)
            if sample.ndim != 1 or not len(sample) or not np.isfinite(sample).all():
                raise OptimizationError('Invalid simulation samples', 'invalid_input')
            candidates.append(Candidate(comp.prospect_id, decision, float(sample.mean()), float(sample.std()), metric.capital_required))
            samples.append(sample)
    matrix = np.column_stack(samples)
    records = {}
    recommended = recommended_dist = None
    penalties = sorted(set([0., *np.geomspace(.1, 20, max(2, n_frontier_points - 1)), risk_aversion]))
    for penalty in penalties:
        selected, distribution, binding = solve(candidates, matrix, budget, penalty, typed, basins or {})
        loss = np.maximum(-distribution, 0)
        worst = np.sort(loss)[int(.9 * len(loss)):]
        point = FrontierPoint(expected_npv=float(distribution.mean()), portfolio_risk=float(distribution.std()),
                              allocation={c.prospect_id: c.decision for c in selected},
                              capital_deployed=sum(c.capital for c in selected), capital_remaining=budget - sum(c.capital for c in selected),
                              expected_loss=float(loss.mean()), probability_of_loss=float((distribution < 0).mean()),
                              cvar90_loss=float(worst.mean()), binding_constraints=binding)
        records[tuple(sorted(point.allocation.items()))] = (point, distribution)
        if penalty == risk_aversion:
            recommended, recommended_dist = point, distribution
    assert recommended is not None and recommended_dist is not None
    points = [r[0] for r in records.values()]
    frontier = [p for p in points if not any(q.expected_npv >= p.expected_npv and q.expected_loss <= p.expected_loss and
                (q.expected_npv > p.expected_npv + 1e-6 or q.expected_loss < p.expected_loss - 1e-6) for q in points)]
    individual = sum(float(np.std(simulation_samples[(pid, decision)])) for pid, decision in recommended.allocation.items())
    return PortfolioOptimizationResult(efficient_frontier=sorted(frontier, key=lambda p: p.expected_loss), recommended_portfolio=recommended,
                                       prospect_robustness={}, total_portfolio_npv_distribution=_summary(recommended_dist),
                                       diversification_benefit=max(0, individual - recommended.portfolio_risk), risk_aversion=risk_aversion)
