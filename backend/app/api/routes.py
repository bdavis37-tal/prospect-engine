from fastapi import APIRouter

from app.engine.models import PortfolioInput, PortfolioOptimizationResult
from app.engine.scenario_engine import compare_scenarios

router = APIRouter(prefix="/api", tags=["portfolio"])


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/optimize", response_model=PortfolioOptimizationResult)
def optimize(payload: PortfolioInput) -> PortfolioOptimizationResult:
    comparison = compare_scenarios(payload, payload.price_scenarios)
    return comparison.scenario_results[0].optimization_result