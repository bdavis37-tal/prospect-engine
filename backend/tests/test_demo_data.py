"""Tests for demo data fixtures — verify completeness and consistency."""
from __future__ import annotations

import json
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DEMO_DIR = REPO_ROOT / "frontend" / "src" / "data" / "demos"

PERMIAN_DIR = DEMO_DIR / "permian"
GOM_DIR = DEMO_DIR / "gom"


def _load(path: Path):
    with open(path) as f:
        return json.load(f)


@pytest.fixture
def permian_input():
    return _load(PERMIAN_DIR / "demo_input.json")


@pytest.fixture
def permian_results():
    return _load(PERMIAN_DIR / "demo_results.json")


@pytest.fixture
def permian_scene():
    return _load(PERMIAN_DIR / "demo_3d_scene.json")


@pytest.fixture
def gom_input():
    return _load(GOM_DIR / "demo_input.json")


@pytest.fixture
def gom_results():
    return _load(GOM_DIR / "demo_results.json")


@pytest.fixture
def gom_scene():
    return _load(GOM_DIR / "demo_3d_scene.json")


# ---- Permian input fixture ----

class TestPermianInput:
    def test_has_15_prospects(self, permian_input):
        assert len(permian_input["prospects"]) == 15

    def test_budget_150m(self, permian_input):
        assert permian_input["capital_budget"] == 150_000_000

    def test_all_prospects_have_coordinates(self, permian_input):
        for p in permian_input["prospects"]:
            assert isinstance(p["latitude"], (int, float))
            assert isinstance(p["longitude"], (int, float))
            assert -90 <= p["latitude"] <= 90
            assert -180 <= p["longitude"] <= 180

    def test_all_prospects_have_resource_estimate(self, permian_input):
        for p in permian_input["prospects"]:
            re = p["resource_estimate"]
            assert re["p10"] >= re["p50"] >= re["p90"] > 0

    def test_has_price_scenarios(self, permian_input):
        assert len(permian_input["price_scenarios"]) == 5

    def test_price_scenarios_have_30_years(self, permian_input):
        for scenario in permian_input["price_scenarios"]:
            assert len(scenario["oil_price_deck"]) == 30
            assert len(scenario["gas_price_deck"]) == 30

    def test_mandatory_drill_constraints(self, permian_input):
        constraints = permian_input["constraints"]
        assert "permian_9" in constraints["mandatory_drill"]
        assert "permian_13" in constraints["mandatory_drill"]

    def test_unique_prospect_ids(self, permian_input):
        ids = [p["prospect_id"] for p in permian_input["prospects"]]
        assert len(ids) == len(set(ids))


# ---- GOM input fixture ----

class TestGomInput:
    def test_has_8_prospects(self, gom_input):
        assert len(gom_input["prospects"]) == 8

    def test_budget_600m(self, gom_input):
        assert gom_input["capital_budget"] == 600_000_000

    def test_all_prospects_have_water_depth(self, gom_input):
        for p in gom_input["prospects"]:
            assert p.get("water_depth_ft") is not None or p["basin"] != "gom_deepwater"

    def test_has_price_scenarios(self, gom_input):
        assert len(gom_input["price_scenarios"]) == 5

    def test_unique_prospect_ids(self, gom_input):
        ids = [p["prospect_id"] for p in gom_input["prospects"]]
        assert len(ids) == len(set(ids))


# ---- Results fixtures ----

class TestPermianResults:
    def test_has_results_for_all_prospects(self, permian_input, permian_results):
        input_ids = {p["prospect_id"] for p in permian_input["prospects"]}
        result_ids = {r["prospect_id"] for r in permian_results["prospect_results"]}
        assert input_ids == result_ids

    def test_simulation_fields_present(self, permian_results):
        for pr in permian_results["prospect_results"]:
            sim = pr["simulation"]
            assert "expected_npv" in sim
            assert "probability_positive_npv" in sim
            assert "capital_at_risk" in sim
            assert "npv_histogram_data" in sim
            assert len(sim["npv_histogram_data"]) > 0
            assert len(sim["annual_cash_flows_p50"]) == 30

    def test_decision_comparison_present(self, permian_results):
        for pr in permian_results["prospect_results"]:
            dc = pr["decision_comparison"]
            assert "recommendation" in dc
            assert dc["recommendation"] in ("drill", "farm_out", "divest", "defer")
            assert set(dc["options"].keys()) == {"drill", "farm_out", "divest", "defer"}

    def test_scenario_comparison_present(self, permian_results):
        sc = permian_results["scenario_comparison"]
        assert len(sc["scenario_results"]) == 5
        for sr in sc["scenario_results"]:
            assert "optimization_result" in sr
            opt = sr["optimization_result"]
            assert len(opt["efficient_frontier"]) > 0
            assert "recommended_portfolio" in opt

    def test_tornado_present(self, permian_results):
        for pr in permian_results["prospect_results"]:
            assert "tornado" in pr
            assert len(pr["tornado"]["sensitivities"]) > 0


class TestGomResults:
    def test_has_results_for_all_prospects(self, gom_input, gom_results):
        input_ids = {p["prospect_id"] for p in gom_input["prospects"]}
        result_ids = {r["prospect_id"] for r in gom_results["prospect_results"]}
        assert input_ids == result_ids

    def test_scenario_comparison_present(self, gom_results):
        sc = gom_results["scenario_comparison"]
        assert len(sc["scenario_results"]) == 5


# ---- 3D scene fixtures ----

class TestPermianScene:
    def test_scene_type_onshore(self, permian_scene):
        assert permian_scene["scene_type"] == "onshore"

    def test_geological_layers_present(self, permian_scene):
        assert len(permian_scene["geological_layers"]) >= 2

    def test_prospect_3d_matches_input(self, permian_input, permian_scene):
        input_ids = {p["prospect_id"] for p in permian_input["prospects"]}
        scene_ids = {p["prospect_id"] for p in permian_scene["prospect_3d"]}
        assert input_ids == scene_ids

    def test_camera_presets(self, permian_scene):
        presets = permian_scene["camera_presets"]
        assert "perspective" in presets
        assert "top_down" in presets
        assert "cross_section" in presets


class TestGomScene:
    def test_scene_type_offshore(self, gom_scene):
        assert gom_scene["scene_type"] == "offshore"

    def test_has_tieback_connections(self, gom_scene):
        assert len(gom_scene.get("tieback_connections", [])) >= 3

    def test_has_infrastructure(self, gom_scene):
        assert len(gom_scene["infrastructure"]) >= 3

    def test_prospect_3d_has_water_depth(self, gom_scene):
        for p in gom_scene["prospect_3d"]:
            assert "water_depth_ft" in p
