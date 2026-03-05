from app.engine.decline_curves import calculate_eur, calculate_production_profile
from app.engine.models import DeclineParameters


def test_decline_curve_profile_positive_and_declining() -> None:
    params = DeclineParameters(
        initial_production_rate=1200,
        initial_decline_rate=0.7,
        b_factor=1.1,
        terminal_decline_rate=0.08,
        well_life_years=20,
    )
    profile = calculate_production_profile(params)
    assert len(profile) == 20
    assert profile[0].volume > profile[5].volume > profile[10].volume
    assert calculate_eur(params) > 0