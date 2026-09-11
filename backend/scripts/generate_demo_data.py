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

from app.engine.models import CommodityPriceScenario, PortfolioInput

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
PRICE_SCENARIOS_PATH = backend_dir / "app" / "data" / "price_scenarios.json"
DEMO_DIR = REPO_ROOT / "frontend" / "src" / "data" / "demos"



def load_price_scenarios() -> list[CommodityPriceScenario]:
    with open(PRICE_SCENARIOS_PATH, encoding="utf-8") as f:
        data = json.load(f)
    return [CommodityPriceScenario(**s) for s in data["scenarios"]]


def load_demo_input(scenario_dir: Path) -> dict:
    with open(scenario_dir / "demo_input.json", encoding="utf-8") as f:
        return json.load(f)


def process_demo(scenario_name: str, scenario_dir: Path, all_scenarios: list[CommodityPriceScenario]) -> None:
    from app.engine.scenario_engine import analyze
    raw = load_demo_input(scenario_dir)
    raw['name'] = scenario_name
    raw['simulation_iterations'] = 1000
    raw['price_scenarios'] = [s.model_dump() for s in all_scenarios]
    portfolio = PortfolioInput(**raw)
    print(f"Generating {scenario_name}", flush=True)
    result = analyze(portfolio, lambda v,t: print(f"{v:.0%} {t}", flush=True))
    (scenario_dir / 'analysis.json').write_text(result.model_dump_json(), encoding='utf-8')
    (scenario_dir / 'demo_input.json').write_text(portfolio.model_dump_json(indent=2), encoding='utf-8')
    legacy = dict(scenario_name=scenario_name, n_iterations=portfolio.simulation_iterations, random_seed=portfolio.random_seed,
                  n_prospects=len(portfolio.prospects), capital_budget=portfolio.capital_budget, discount_rate=portfolio.discount_rate,
                  prospect_results=[p.model_dump(mode='json') for p in result.scenario_comparison.scenario_results[0].prospect_results],
                  scenario_comparison=result.scenario_comparison.model_dump(mode='json'))
    (scenario_dir / 'demo_results.json').write_text(json.dumps(legacy), encoding='utf-8')


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
