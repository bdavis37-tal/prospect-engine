import json
from pathlib import Path

from app.engine.models import CommodityPriceScenario, Prospect
from app.engine.prospect_economics import calculate_prospect_economics


def _load_json(name: str) -> dict:
    return json.loads((Path(__file__).parent / "fixtures" / name).read_text(encoding="utf-8"))


def _base_scenario() -> CommodityPriceScenario:
    deck = [{"year": y, "price_per_unit": 75.0} for y in range(1, 31)]
    return CommodityPriceScenario(
        scenario_name="Flat",
        oil_price_deck=deck,
        gas_price_deck=[{"year": y, "price_per_unit": 3.25} for y in range(1, 31)],
        price_volatility=0.0,
        price_correlation_oil_gas=0.5,
    )


def test_single_permian_deterministic_economics_within_tolerance() -> None:
    prospect = Prospect(**_load_json("single_prospect_permian.json"))
    expected = _load_json("expected_single_permian_deterministic.json")
    econ = calculate_prospect_economics(
        prospect,
        _base_scenario(),
        discount_rate=0.10,
        well_cost=prospect.well_cost.base,
        completion_cost=prospect.completion_cost.base,
        opex_per_unit=prospect.opex_per_boe.base,
    )

    assert abs(econ.npv - expected["npv"]) / max(abs(expected["npv"]), 1) < 0.01
    assert econ.irr is not None
    assert abs(econ.irr - expected["irr"]) < 0.01
    assert econ.payout_period_years == expected["payout_period_years"]
    assert abs(econ.capital_efficiency - expected["capital_efficiency"]) < 0.01