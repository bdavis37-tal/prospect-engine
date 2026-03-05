from __future__ import annotations

from typing import Optional

import numpy as np
from scipy.optimize import brentq

from app.engine.decline_curves import calculate_production_profile
from app.engine.models import CommodityPriceScenario, Prospect, ProspectEconomics


def _irr(cash_flows: list[float]) -> Optional[float]:
    def f(rate: float) -> float:
        return sum(cf / (1 + rate) ** i for i, cf in enumerate(cash_flows))

    try:
        return float(brentq(f, -0.99, 10.0))
    except ValueError:
        return None


def calculate_prospect_economics(
    prospect: Prospect,
    scenario: CommodityPriceScenario,
    discount_rate: float,
    well_cost: float,
    completion_cost: float,
    opex_per_unit: float,
    production_scale: float = 1.0,
) -> ProspectEconomics:
    """Compute deterministic economics for one prospect realization.

    Parameters
    ----------
    prospect:
        Prospect metadata and decline parameters.
    scenario:
        Commodity price scenario.
    discount_rate:
        Discount rate for NPV.
    well_cost:
        Well drilling cost.
    completion_cost:
        Well completion cost.
    opex_per_unit:
        Operating expense per produced unit.
    production_scale:
        Scalar applied to production profile.
    """
    profile = calculate_production_profile(prospect.decline_params)
    annual_prod = np.array([p.volume * production_scale for p in profile], dtype=float)

    if prospect.hydrocarbon_type == "gas":
        prices = np.array([p.price_per_unit for p in scenario.gas_price_deck[: len(annual_prod)]], dtype=float)
    else:
        prices = np.array([p.price_per_unit for p in scenario.oil_price_deck[: len(annual_prod)]], dtype=float)

    gross_revenue = annual_prod * prices
    net_revenue = gross_revenue * float(prospect.net_revenue_interest)
    opex = annual_prod * opex_per_unit
    noi = net_revenue - opex
    taxes = np.maximum(noi, 0.0) * prospect.tax_rate
    after_tax_cf = noi - taxes

    capital = (well_cost + completion_cost + prospect.facility_cost) * prospect.working_interest
    cash_flows = [-capital] + after_tax_cf.tolist()
    years = np.arange(1, len(after_tax_cf) + 1)
    npv = float((after_tax_cf / (1 + discount_rate) ** years).sum() - capital)
    irr = _irr(cash_flows)

    cumulative = np.cumsum(after_tax_cf) - capital
    payout_indices = np.where(cumulative >= 0)[0]
    payout = float(payout_indices[0] + 1) if len(payout_indices) > 0 else None

    capital_efficiency = npv / capital if capital else 0.0
    pi = (npv + capital) / capital if capital else 0.0

    return ProspectEconomics(
        annual_production=annual_prod.tolist(),
        annual_revenue=gross_revenue.tolist(),
        annual_cash_flows=after_tax_cf.tolist(),
        capital_investment=capital,
        npv=npv,
        irr=irr,
        payout_period_years=payout,
        capital_efficiency=capital_efficiency,
        profitability_index=pi,
    )