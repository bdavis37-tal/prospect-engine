from __future__ import annotations

import numpy as np
from scipy.stats import norm

from app.engine.decline_curves import calculate_production_profile
from app.engine.models import (
    BinData,
    CommodityPriceScenario,
    DistributionParams,
    DistributionSummary,
    HydrocarbonType,
    Prospect,
    SimulationResult,
)
from app.engine.price_models import generate_correlated_oil_gas_paths


def _sample_distribution(params: DistributionParams, n: int, rng: np.random.Generator) -> np.ndarray:
    if params.low == params.high:
        return np.full(n, params.base, dtype=float)
    if params.distribution_type == "lognormal":
        mu = np.log(max(params.base, 1e-6))
        sigma = abs(np.log(max(params.high, 1e-6) / max(params.low, 1e-6))) / 2.563
        return rng.lognormal(mean=mu, sigma=max(sigma, 1e-6), size=n)
    return rng.triangular(left=params.low, mode=params.base, right=params.high, size=n)


def _sample_resource(resource, n: int, rng: np.random.Generator) -> np.ndarray:
    if resource.p10 == resource.p90:
        return np.full(n, resource.p50, dtype=float)
    mu = np.log(max(resource.p50, 1e-6))
    sigma = (np.log(max(resource.p10, 1e-6)) - np.log(max(resource.p90, 1e-6))) / (norm.ppf(0.9) - norm.ppf(0.1))
    return rng.lognormal(mean=mu, sigma=max(sigma, 1e-6), size=n)


def _summary(values: np.ndarray) -> DistributionSummary:
    return DistributionSummary(
        mean=float(np.mean(values)),
        std=float(np.std(values)),
        p10=float(np.percentile(values, 90)),
        p50=float(np.percentile(values, 50)),
        p90=float(np.percentile(values, 10)),
        min=float(np.min(values)),
        max=float(np.max(values)),
    )


def _resource_unit_multiplier(unit: str) -> float:
    unit_upper = unit.upper()
    if unit_upper in {"MBOE", "MBO"}:
        return 1_000.0
    if unit_upper in {"MMBOE", "MMBO", "BCF"}:
        return 1_000_000.0
    return 1.0


def _hist(values: np.ndarray, bins: int = 30) -> list[BinData]:
    counts, edges = np.histogram(values, bins=bins)
    return [BinData(bin_start=float(edges[i]), bin_end=float(edges[i + 1]), frequency=int(counts[i])) for i in range(len(counts))]


def _vectorized_irr(capital: np.ndarray, cashflows: np.ndarray, max_iter: int = 60) -> np.ndarray:
    """Unique conventional IRRs only; undefined/non-conventional draws remain NaN.

    Bisection in log(1+r) avoids clipping an unconverged Newton iterate into
    a plausible-looking IRR. Negative operating cash flows can introduce
    multiple roots, so those paths are deliberately excluded from this metric.
    """
    valid = (capital > 0) & np.all(cashflows >= 0, axis=1) & np.any(cashflows > 0, axis=1)
    result = np.full(capital.shape, np.nan)
    if not valid.any(): return result
    values = cashflows[valid]
    costs = capital[valid]
    years = np.arange(1, values.shape[1]+1)
    low = np.full(costs.shape, -14.0); high = np.full(costs.shape, 14.0)
    for _ in range(max_iter):
        mid = (low+high)/2
        residual = np.sum(values * np.exp(-mid[:,None]*years), axis=1) - costs
        low = np.where(residual > 0, mid, low)
        high = np.where(residual > 0, high, mid)
    rates = np.expm1((low+high)/2)
    residual = np.sum(values / (1+rates[:,None])**years, axis=1) - costs
    result[valid] = np.where(np.abs(residual) <= np.maximum(costs, 1)*1e-7, rates, np.nan)
    return result


def run_simulation(
    prospect: Prospect,
    price_scenarios: list[CommodityPriceScenario],
    n_iterations: int = 10_000,
    discount_rate: float = 0.10,
    random_seed: int | None = 42,
    price_seed: int | None = None,
) -> SimulationResult:
    """Run vectorized Monte Carlo simulation for a single prospect."""
    rng = np.random.default_rng(random_seed)
    scenario = price_scenarios[0]

    resource = _sample_resource(prospect.resource_estimate, n_iterations, rng)
    recovery = _sample_distribution(prospect.recovery_factor, n_iterations, rng)
    recoverable = resource * recovery * _resource_unit_multiplier(prospect.resource_estimate.unit)

    base_profile = np.array([r.volume for r in calculate_production_profile(prospect.decline_params)], dtype=float)
    base_eur = max(base_profile.sum(), 1e-6)
    scale = recoverable / base_eur
    production = scale[:, None] * base_profile[None, :]

    well_cost = _sample_distribution(prospect.well_cost, n_iterations, rng)
    completion_cost = _sample_distribution(prospect.completion_cost, n_iterations, rng)
    opex = _sample_distribution(prospect.opex_per_boe, n_iterations, rng)

    oil_paths, gas_paths = generate_correlated_oil_gas_paths(
        scenario.oil_price_deck,
        scenario.gas_price_deck,
        scenario.price_volatility,
        n_iterations,
        scenario.price_correlation_oil_gas,
        random_state=price_seed if price_seed is not None else random_seed,
    )

    if prospect.hydrocarbon_type == HydrocarbonType.GAS:
        prices = gas_paths[:, : production.shape[1]] * (1 if prospect.resource_estimate.unit in {"MCF", "BCF"} else 6)
    else:
        fraction = prospect.oil_fraction if prospect.hydrocarbon_type == HydrocarbonType.MIXED else 1
        prices = fraction * oil_paths[:, : production.shape[1]] + (1 - fraction) * 6 * gas_paths[:, : production.shape[1]]

    gross_revenue = production * prices
    net_revenue = gross_revenue * float(prospect.net_revenue_interest)
    operating_cost = production * opex[:, None] * prospect.working_interest
    noi = net_revenue - operating_cost
    taxes = np.maximum(noi, 0.0) * prospect.tax_rate
    cashflows = noi - taxes

    capital = (well_cost + completion_cost + prospect.facility_cost) * prospect.working_interest
    years = np.arange(1, cashflows.shape[1] + 1)
    discounted = cashflows / (1 + discount_rate) ** years[None, :]
    npvs = discounted.sum(axis=1) - capital

    irr = _vectorized_irr(capital, cashflows)
    cumulative = np.cumsum(cashflows, axis=1) - capital[:, None]
    positive = cumulative >= 0
    payout = (positive.argmax(axis=1) + 1)[positive.any(axis=1)].astype(float)
    defined_irr = irr[np.isfinite(irr)]

    order = np.argsort(npvs)
    cf_sorted = cashflows[order]
    idx10 = int(0.90 * (n_iterations - 1))
    idx50 = int(0.50 * (n_iterations - 1))
    idx90 = int(0.10 * (n_iterations - 1))

    return SimulationResult(
        prospect_id=prospect.prospect_id,
        n_iterations=n_iterations,
        npv_distribution=_summary(npvs),
        irr_distribution=_summary(defined_irr) if len(defined_irr) else None,
        payout_distribution=_summary(payout) if len(payout) else None,
        probability_positive_npv=float(np.mean(npvs > 0)),
        expected_npv=float(np.mean(npvs)),
        expected_irr=float(np.mean(defined_irr)) if len(defined_irr) else None,
        irr_defined_fraction=len(defined_irr)/n_iterations,
        probability_payout_within_life=len(payout)/n_iterations,
        npv_histogram_data=_hist(npvs),
        irr_histogram_data=_hist(defined_irr) if len(defined_irr) else [],
        capital_at_risk=float(np.mean(capital)),
        risk_reward_ratio=float(np.mean(npvs) / max(np.std(npvs), 1e-9)),
        annual_cash_flows_p10=cf_sorted[idx10].tolist(),
        annual_cash_flows_p50=cf_sorted[idx50].tolist(),
        annual_cash_flows_p90=cf_sorted[idx90].tolist(),
        sample_npvs=npvs.tolist(),
    )