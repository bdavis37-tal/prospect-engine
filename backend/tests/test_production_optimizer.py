import itertools
import numpy as np
import pytest
from pydantic import ValidationError
from app.engine.models import DecisionComparison, DecisionMetrics, DecisionType as D, PortfolioConstraints, Basin
from app.engine.portfolio_optimizer import optimize_portfolio, OptimizationError


def fixture():
    samples = {('a',D.DRILL): np.array([-20.,100,100,100]), ('a',D.DEFER): np.array([-1.]*4),
               ('b',D.DRILL): np.array([80.,-10,80,80]), ('b',D.DEFER):np.array([-1.]*4)}
    comparisons = [DecisionComparison(prospect_id=pid, recommendation=D.DRILL, options={
        d: DecisionMetrics(decision_type=d, expected_npv=float(samples[(pid,d)].mean()), capital_required=8 if d == D.DRILL else 1,
                           probability_positive_npv=.75,capital_efficiency=1) for d in [D.DRILL,D.DEFER]}) for pid in ['a','b']]
    return comparisons,samples


def test_infeasible_fails_closed():
    c,s=fixture()
    with pytest.raises(OptimizationError,match='No verified allocation'):
        optimize_portfolio(c,s,5,{'mandatory_drill':['a']},3)


def test_concentration_and_basin_minimum_enforced():
    c,s=fixture()
    result=optimize_portfolio(c,s,20,{'max_single_prospect_pct_of_budget':.1},3)
    assert set(result.recommended_portfolio.allocation.values()) == {D.DEFER}
    result=optimize_portfolio(c,s,10,{'min_basin_allocation':{'bakken':.8}},3,basins={'a':Basin.BAKKEN,'b':Basin.GOM_DEEPWATER})
    assert result.recommended_portfolio.allocation['a'] == D.DRILL
    assert result.recommended_portfolio.capital_deployed <= 10


def test_objective_matches_exhaustive_enumeration_and_statistics():
    c,s=fixture()
    for penalty in [0,1,20]:
        result=optimize_portfolio(c,s,10,None,3,risk_aversion=penalty)
        valid=[]
        for decisions in itertools.product([D.DRILL,D.DEFER],repeat=2):
            cap=sum(8 if d==D.DRILL else 1 for d in decisions)
            if cap<=10:
                outcomes=sum(s[(pid,d)] for pid,d in zip(['a','b'],decisions))
                valid.append(float(outcomes.mean()-penalty*np.maximum(-outcomes,0).mean()))
        r=result.recommended_portfolio
        outcomes=sum(s[(pid,d)] for pid,d in r.allocation.items())
        assert r.expected_npv-penalty*r.expected_loss == pytest.approx(max(valid))
        assert result.total_portfolio_npv_distribution.std == pytest.approx(outcomes.std())
        assert result.total_portfolio_npv_distribution.p10 == pytest.approx(np.percentile(outcomes,90))
        for point in result.efficient_frontier:
            assert point.expected_npv == pytest.approx(sum(s[(pid,d)] for pid,d in point.allocation.items()).mean())


def test_invalid_constraint_references_and_conflicts():
    c,s=fixture()
    with pytest.raises(OptimizationError): optimize_portfolio(c,s,10,{'mandatory_drill':['missing']},3)
    with pytest.raises(ValidationError): PortfolioConstraints(mandatory_drill=['a'],mandatory_defer=['a'])
    with pytest.raises(ValidationError): PortfolioConstraints(min_prospects_drilled=2,max_prospects_drilled=1)


def test_timeout_never_returns_a_recommendation(monkeypatch):
    from types import SimpleNamespace
    monkeypatch.setattr('app.engine.portfolio_optimizer.milp',lambda **kw:SimpleNamespace(success=False,status=1,x=None))
    c,s=fixture()
    with pytest.raises(OptimizationError) as e: optimize_portfolio(c,s,10,None,3)
    assert e.value.code == 'timeout'
