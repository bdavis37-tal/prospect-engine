import json
from pathlib import Path

from app.engine.models import CommodityPriceScenario, Prospect
from app.engine.monte_carlo import run_simulation


def _load_json(name: str) -> dict:
    return json.loads((Path(__file__).parent / "fixtures" / name).read_text(encoding="utf-8"))


def _scenario() -> CommodityPriceScenario:
    deck = [{"year": y, "price_per_unit": 75.0 + y * 0.5} for y in range(1, 31)]
    return CommodityPriceScenario(
        scenario_name="Base",
        oil_price_deck=deck,
        gas_price_deck=[{"year": y, "price_per_unit": 3.2 + y * 0.02} for y in range(1, 31)],
        price_volatility=0.15,
        price_correlation_oil_gas=0.5,
    )


def test_single_permian_stochastic_distribution_ordering() -> None:
    prospect = Prospect(**_load_json("single_prospect_permian.json"))
    result = run_simulation(prospect, [_scenario()], n_iterations=3000, random_seed=7)
    assert result.npv_distribution.p10 > result.npv_distribution.p50 > result.npv_distribution.p90
    assert 0 <= result.probability_positive_npv <= 1
    assert len(result.npv_histogram_data) > 0

def test_irr_is_solved_and_undefined_paths_are_not_clipped():
    import numpy as np
    from app.engine.monte_carlo import _vectorized_irr
    rates=_vectorized_irr(np.array([100.,100.,100.,0.]),np.array([[110.],[1000.],[-20.],[50.]]))
    assert abs(rates[0]-.1)<1e-8
    assert abs(rates[1]-9)<1e-8
    assert np.isnan(rates[2]) and np.isnan(rates[3])


def test_resource_draws_independent_but_prices_shared():
    import numpy as np
    from app.engine.scenario_engine import prospect_seed
    from app.engine.price_models import generate_correlated_oil_gas_paths
    a=prospect_seed(42,"asset-a"); b=prospect_seed(42,"asset-b")
    assert a!=b and a==prospect_seed(42,"asset-a")
    assert abs(np.corrcoef(np.random.default_rng(a).normal(size=10000),np.random.default_rng(b).normal(size=10000))[0,1])<.04
    scenario=_scenario()
    oil,gas=generate_correlated_oil_gas_paths(scenario.oil_price_deck,scenario.gas_price_deck,.2,20000,.65,random_state=42)
    # First-year log innovations must retain the requested oil/gas correlation.
    assert abs(np.corrcoef(np.log(oil[:,0]),np.log(gas[:,0]))[0,1]-.65)<.02
