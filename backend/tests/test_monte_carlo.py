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