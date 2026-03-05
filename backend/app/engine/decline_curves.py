from __future__ import annotations

import math
from dataclasses import dataclass

from app.engine.models import DeclineParameters


@dataclass
class AnnualProduction:
    year: int
    volume: float


def _rate_hyperbolic(qi: float, di: float, b: float, t: float) -> float:
    # Arps hyperbolic decline: q(t) = qi / (1 + b*Di*t)^(1/b) - Arps (1945)
    if b == 0:
        return qi * math.exp(-di * t)
    return qi / (1.0 + b * di * t) ** (1.0 / b)


def _rate_exponential(qi: float, di: float, t: float) -> float:
    return qi * math.exp(-di * t)


def calculate_production_profile(params: DeclineParameters) -> list[AnnualProduction]:
    """Calculate annual production profile using modified Arps decline.

    Parameters
    ----------
    params:
        Decline curve parameters.

    Returns
    -------
    list[AnnualProduction]
        Annualized production volumes.
    """
    qi = params.initial_production_rate
    di = params.initial_decline_rate
    b = params.b_factor
    dt = 1.0 / 12.0
    rates: list[float] = []
    switch_t = 0.0

    if b > 0:
        t = dt
        while t <= params.well_life_years:
            q = _rate_hyperbolic(qi, di, b, t)
            inst_decline = di / (1 + b * di * t)
            if inst_decline <= params.terminal_decline_rate:
                switch_t = t
                break
            t += dt

    profile: list[AnnualProduction] = []
    for year in range(1, params.well_life_years + 1):
        vol = 0.0
        for month in range(12):
            t = (year - 1) + (month + 1) * dt
            if b > 0 and switch_t > 0 and t > switch_t:
                q_switch = _rate_hyperbolic(qi, di, b, switch_t)
                q = _rate_exponential(q_switch, params.terminal_decline_rate, t - switch_t)
            elif b == 1:
                q = qi / (1 + di * t)
            else:
                q = _rate_hyperbolic(qi, di, b, t)
            vol += q * 365.25 * dt
        rates.append(vol)
        profile.append(AnnualProduction(year=year, volume=vol))
    return profile


def calculate_eur(params: DeclineParameters) -> float:
    """Calculate cumulative production over well life."""
    return sum(row.volume for row in calculate_production_profile(params))