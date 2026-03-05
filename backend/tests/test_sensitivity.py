from app.engine.sensitivity import generate_tornado


def test_tornado_sorted_by_swing() -> None:
    result = generate_tornado(
        10_000_000,
        {
            "resource_volume": (6_000_000, 14_000_000),
            "well_cost": (9_000_000, 11_000_000),
            "commodity_price": (5_000_000, 16_000_000),
        },
    )
    assert result.sensitivities[0].variable_name == "commodity_price"
    assert result.sensitivities[0].swing >= result.sensitivities[1].swing