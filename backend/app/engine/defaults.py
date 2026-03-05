from __future__ import annotations

import json
from pathlib import Path


DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def get_basin_defaults(basin: str) -> dict:
    data = json.loads((DATA_DIR / "basin_benchmarks.json").read_text(encoding="utf-8"))
    return data.get(basin, data["generic_onshore_us"])