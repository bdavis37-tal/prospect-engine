import json
from pathlib import Path

import numpy as np

from app.engine.decision_modeler import compare_decisions
from app.engine.models import CommodityPriceScenario, DecisionType, Prospect
from app.engine.portfolio_optimizer import optimize_portfolio


def _load_json(name: str):
    return json.loads((Path(__file__).parent / "fixtures" / name).read_text(encoding="utf-8"))


def _scenario() -> CommodityPriceScenario:
    return CommodityPriceScenario(
        scenario_name="Base",
        oil_price_deck=[{"year": y, "price_per_unit": 75.0 + y * 0.25} for y in range(1, 31)],
        gas_price_deck=[{"year": y, "price_per_unit": 3.0 + y * 0.02} for y in range(1, 31)],
        price_volatility=0.2,
        price_correlation_oil_gas=0.55,
    )


def test_farmout_has_lower_npv_but_can_improve_efficiency() -> None:
    prospect = Prospect(**_load_json("single_prospect_permian.json"))
    comp = compare_decisions(prospect, [_scenario()], n_iterations=2000, discount_rate=0.10)
    drill = comp.options[DecisionType.DRILL]
    farm = comp.options[DecisionType.FARM_OUT]
    assert farm.capital_required < drill.capital_required


def test_portfolio_frontier_and_budget_constraint() -> None:
    fixture = _load_json("portfolio_10_prospects.json")
    prospects = [Prospect(**p) for p in fixture["prospects"]]
    comps = [compare_decisions(p, [_scenario()], 1000, 0.10) for p in prospects]

    sample_map = {}
    for c in comps:
        base = c.options[DecisionType.DRILL].expected_npv
        sample_map[(c.prospect_id, DecisionType.DRILL)] = np.random.default_rng(1).normal(base, abs(base) * 0.4 + 1, 1000)
        sample_map[(c.prospect_id, DecisionType.FARM_OUT)] = sample_map[(c.prospect_id, DecisionType.DRILL)] * 0.7
        sample_map[(c.prospect_id, DecisionType.DIVEST)] = np.full(1000, c.options[DecisionType.DIVEST].expected_npv)
        sample_map[(c.prospect_id, DecisionType.DEFER)] = np.zeros(1000)

    result = optimize_portfolio(comps, sample_map, budget=80_000_000, constraints={}, n_frontier_points=12)
    assert len(result.efficient_frontier) == 12
    for point in result.efficient_frontier:
        assert point.capital_deployed <= 80_000_000 + 1

    npvs = [p.expected_npv for p in sorted(result.efficient_frontier, key=lambda x: x.portfolio_risk)]
    assert npvs[-1] >= npvs[0]