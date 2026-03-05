#!/usr/bin/env python3
"""Generate pre-computed demo data for the Permian and GOM scenarios.

Run from the repository root:
    python -m backend.scripts.generate_demo_data

Or directly:
    cd backend && python scripts/generate_demo_data.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

# Ensure backend package is importable
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.engine.decision_modeler import compare_decisions
from app.engine.models import (
    CommodityPriceScenario,
    DecisionType,
    PortfolioInput,
    Prospect,
)
from app.engine.monte_carlo import run_simulation
from app.engine.portfolio_optimizer import optimize_portfolio
from app.engine.scenario_engine import compare_scenarios
from app.engine.sensitivity import generate_tornado

import numpy as np

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
PRICE_SCENARIOS_PATH = backend_dir / "app" / "data" / "price_scenarios.json"
DEMO_DIR = REPO_ROOT / "frontend" / "src" / "data" / "demos"

RANDOM_SEED = 42
N_ITERATIONS = 5000  # Fewer iterations for demo speed; still statistically meaningful


def load_price_scenarios() -> list[CommodityPriceScenario]:
    with open(PRICE_SCENARIOS_PATH) as f:
        data = json.load(f)
    return [CommodityPriceScenario(**s) for s in data["scenarios"]]


def load_demo_input(scenario_dir: Path) -> dict:
    with open(scenario_dir / "demo_input.json") as f:
        return json.load(f)


def build_portfolio(raw: dict, scenarios: list[CommodityPriceScenario]) -> PortfolioInput:
    raw["price_scenarios"] = [s.model_dump() for s in scenarios]
    raw["simulation_iterations"] = N_ITERATIONS
    return PortfolioInput(**raw)


def generate_prospect_results(
    prospect: Prospect,
    scenarios: list[CommodityPriceScenario],
    discount_rate: float,
) -> dict:
    """Run simulation and decision comparison for a single prospect."""
    sim_result = run_simulation(
        prospect, scenarios, n_iterations=N_ITERATIONS,
        discount_rate=discount_rate, random_seed=RANDOM_SEED,
    )
    comparison = compare_decisions(
        prospect, scenarios, n_iterations=N_ITERATIONS,
        discount_rate=discount_rate,
    )

    # Tornado sensitivity
    base_npv = sim_result.expected_npv
    tornado = generate_tornado(base_npv, {
        "Oil Price": (base_npv * 0.6, base_npv * 1.4),
        "Well Cost": (base_npv * 1.2, base_npv * 0.8),
        "EUR": (base_npv * 0.7, base_npv * 1.5),
        "Opex": (base_npv * 1.1, base_npv * 0.9),
        "Decline Rate": (base_npv * 0.85, base_npv * 1.15),
    })

    # Strip sample_npvs to keep file size manageable (keep first 500)
    sim_dict = sim_result.model_dump()
    sim_dict["sample_npvs"] = sim_dict["sample_npvs"][:500]

    return {
        "prospect_id": prospect.prospect_id,
        "simulation": sim_dict,
        "decision_comparison": comparison.model_dump(),
        "tornado": tornado.model_dump(),
    }


def generate_scenario_results(portfolio: PortfolioInput) -> dict:
    """Run full scenario comparison and portfolio optimization."""
    comparison = compare_scenarios(portfolio, portfolio.price_scenarios)
    return comparison.model_dump()


def process_demo(scenario_name: str, scenario_dir: Path, all_scenarios: list[CommodityPriceScenario]) -> None:
    print(f"\n{'='*60}")
    print(f"Generating demo data for: {scenario_name}")
    print(f"{'='*60}")

    raw_input = load_demo_input(scenario_dir)
    portfolio = build_portfolio(raw_input, all_scenarios)

    # Per-prospect results
    prospect_results = []
    for prospect in portfolio.prospects:
        print(f"  Processing {prospect.name}...")
        result = generate_prospect_results(prospect, all_scenarios, portfolio.discount_rate)
        prospect_results.append(result)

    # Portfolio-level scenario comparison
    print("  Running portfolio optimization across all scenarios...")
    scenario_comparison = generate_scenario_results(portfolio)

    # Assemble full results
    demo_results = {
        "scenario_name": scenario_name,
        "n_iterations": N_ITERATIONS,
        "random_seed": RANDOM_SEED,
        "n_prospects": len(portfolio.prospects),
        "capital_budget": portfolio.capital_budget,
        "discount_rate": portfolio.discount_rate,
        "prospect_results": prospect_results,
        "scenario_comparison": scenario_comparison,
    }

    # Write results
    output_path = scenario_dir / "demo_results.json"
    with open(output_path, "w") as f:
        json.dump(demo_results, f, indent=2, default=str)
    print(f"  Written: {output_path}")

    # Also update demo_input.json with price scenarios included
    input_with_prices = raw_input.copy()
    input_with_prices["price_scenarios"] = [s.model_dump() for s in all_scenarios]
    input_with_prices["simulation_iterations"] = N_ITERATIONS
    input_path = scenario_dir / "demo_input.json"
    with open(input_path, "w") as f:
        json.dump(input_with_prices, f, indent=2, default=str)
    print(f"  Updated: {input_path}")

    size_mb = output_path.stat().st_size / (1024 * 1024)
    print(f"  Results size: {size_mb:.1f} MB")


def main() -> None:
    print("Loading price scenarios...")
    all_scenarios = load_price_scenarios()
    print(f"Loaded {len(all_scenarios)} price scenarios: {[s.scenario_name for s in all_scenarios]}")

    permian_dir = DEMO_DIR / "permian"
    gom_dir = DEMO_DIR / "gom"

    process_demo("Permian Basin Growth Portfolio", permian_dir, all_scenarios)
    process_demo("Gulf of Mexico Deepwater Exploration", gom_dir, all_scenarios)

    print("\nDemo data generation complete!")


if __name__ == "__main__":
    main()
