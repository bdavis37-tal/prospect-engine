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
    """Correlated log-return innovations; expected prices follow the supplied decks."""
    rng = np.random.default_rng(random_state)
    z = rng.standard_normal((n_paths, len(oil_deck), 2))
    oil_z = z[:, :, 0]
    gas_z = correlation * oil_z + np.sqrt(max(0, 1 - correlation**2)) * z[:, :, 1]

    def paths(deck, shocks):
        years = np.arange(1, len(deck) + 1)
        return _deck_to_array(deck)[None, :] * np.exp(
            volatility * np.cumsum(shocks, axis=1) - 0.5 * volatility**2 * years
        )

    return paths(oil_deck, oil_z), paths(gas_deck, gas_z)
