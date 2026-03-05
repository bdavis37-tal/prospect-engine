from __future__ import annotations

import numpy as np

from app.engine.models import AnnualPrice


def _deck_to_array(deck: list[AnnualPrice]) -> np.ndarray:
    return np.array([p.price_per_unit for p in deck], dtype=float)


def generate_price_paths(
    base_deck: list[AnnualPrice],
    volatility: float,
    n_paths: int,
    mode: str = "gbm",
    random_state: int | None = None,
) -> np.ndarray:
    """Generate stochastic price paths around a base price deck."""
    rng = np.random.default_rng(random_state)
    base = _deck_to_array(base_deck)
    n_years = len(base)
    if mode == "deterministic_perturbation":
        shocks = rng.uniform(-volatility, volatility, size=(n_paths, n_years))
        return np.maximum(base * (1.0 + shocks), 0.01)

    ln_base = np.log(np.maximum(base, 0.01))
    drift = np.diff(ln_base, prepend=ln_base[0])
    eps = rng.standard_normal((n_paths, n_years))
    increments = drift + (-0.5 * volatility**2) + volatility * eps
    paths = np.exp(np.cumsum(increments, axis=1) + ln_base[0])
    scale = base / np.maximum(paths.mean(axis=0), 1e-9)
    return paths * scale


def generate_correlated_oil_gas_paths(
    oil_deck: list[AnnualPrice],
    gas_deck: list[AnnualPrice],
    volatility: float,
    n_paths: int,
    correlation: float,
    random_state: int | None = None,
) -> tuple[np.ndarray, np.ndarray]:
    """Generate correlated oil and gas GBM paths via Cholesky factorization."""
    rng = np.random.default_rng(random_state)
    years = len(oil_deck)
    corr = np.array([[1.0, correlation], [correlation, 1.0]], dtype=float)
    chol = np.linalg.cholesky(corr)
    z = rng.standard_normal((n_paths, years, 2))
    correlated = z @ chol.T

    oil = generate_price_paths(oil_deck, volatility, n_paths, random_state=random_state)
    gas = generate_price_paths(gas_deck, volatility, n_paths, random_state=(None if random_state is None else random_state + 7))

    oil = np.maximum(oil * (1 + volatility * 0.1 * correlated[:, :, 0]), 0.01)
    gas = np.maximum(gas * (1 + volatility * 0.1 * correlated[:, :, 1]), 0.01)
    return oil, gas