from __future__ import annotations
import hashlib
import json
from datetime import datetime, timezone
import numpy as np
from app.engine.decision_modeler import simulate_decisions
from app.engine.models import AnalysisResult, CommodityPriceScenario, PortfolioInput, ProspectResult, ScenarioComparison, ScenarioResult
from app.engine.monte_carlo import run_simulation
from app.engine.portfolio_optimizer import optimize_portfolio
from app.engine.sensitivity import generate_tornado

MODEL_VERSION = '2.0.0'
METHODOLOGY = [
    'IRR summaries cover only draws with a unique conventional IRR; irr_defined_fraction reports coverage. Payout summaries condition on payout within modeled life; probability_payout_within_life reports coverage.',
    'All monetary values are USD. Gas is priced per MCF; BOE gas volumes use 6 MCF/BOE. No FX conversion is assumed.',
    'P10/P50/P90 use exceedance convention: P10 is the high outcome (90th percentile).',
    'Objective: expected portfolio NPV minus risk aversion times expected loss. Expected loss averages max(-NPV, 0) across all simulated outcomes.',
    'Capital constraints apply to expected upfront capital, including transaction and holding costs, not a worst-case capital guarantee.',
    'Commodity innovations are shared across prospects; resource and cost draws are independent between prospects, with matched draws for alternatives and scenarios.',
    'Retained farm-out interest is a fraction of original WI. Carry applies to retained drilling/completion capital; facilities are not carried.',
    'Defer includes one year of holding cost and no future option value. Divest includes a fixed transaction cost even when closing fails.',
    'NPV uses year-end cash flows and the supplied discount rate. Operating expenses scale with working interest. Taxes apply to positive operating income.',
    'Sensitivity varies one input by +/-20% using matched random draws; it is not a calibrated confidence interval.',
    'Benchmark defaults are illustrative and unverified. Validate assumptions against asset data before an investment decision.'
]


def input_hash(portfolio: PortfolioInput) -> str:
    return hashlib.sha256(json.dumps(portfolio.model_dump(mode='json'), sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def prospect_seed(seed: int, prospect_id: str) -> int:
    digest = hashlib.sha256(prospect_id.encode()).digest()
    return int(np.random.SeedSequence([seed, int.from_bytes(digest[:4], 'little')]).generate_state(1)[0])


def sensitivities(prospect, scenario, iterations, discount_rate, seed, price_seed, base):
    values = {}
    for variable in ['Commodity price', 'Well cost', 'Recoverable resource', 'Operating cost']:
        cases = []
        for factor in [.8, 1.2]:
            p = prospect.model_copy(deep=True)
            s = scenario.model_copy(deep=True)
            if variable == 'Commodity price':
                for price in s.oil_price_deck + s.gas_price_deck:
                    price.price_per_unit *= factor
            elif variable == 'Recoverable resource':
                p.resource_estimate.p10 *= factor; p.resource_estimate.p50 *= factor; p.resource_estimate.p90 *= factor
            else:
                dist = p.well_cost if variable == 'Well cost' else p.opex_per_boe
                dist.low *= factor; dist.base *= factor; dist.high *= factor
            cases.append(run_simulation(p, [s], iterations, discount_rate, seed, price_seed).expected_npv)
        values[variable] = tuple(cases)
    result = generate_tornado(base, values)
    for item in result.sensitivities:
        item.low_case_value = .8
        item.high_case_value = 1.2
    return result


def compare_scenarios(portfolio: PortfolioInput, scenarios: list[CommodityPriceScenario], progress=None) -> ScenarioComparison:
    results = []
    robustness = {p.prospect_id: {} for p in portfolio.prospects}
    price_seed = int(np.random.SeedSequence([portfolio.random_seed, 963]).generate_state(1)[0])
    total = len(scenarios) * (len(portfolio.prospects) + 1)
    done = 0
    for scenario in scenarios:
        comparisons, sample_map, prospect_results = [], {}, []
        for prospect in portfolio.prospects:
            seed = prospect_seed(portfolio.random_seed, prospect.prospect_id)
            comp, samples, drill = simulate_decisions(prospect, [scenario], portfolio.simulation_iterations, portfolio.discount_rate,
                                                     (portfolio.decisions or {}).get(prospect.prospect_id), seed, price_seed)
            comparisons.append(comp)
            sample_map.update({(prospect.prospect_id, decision): values for decision, values in samples.items()})
            tornado = sensitivities(prospect, scenario, portfolio.simulation_iterations, portfolio.discount_rate, seed, price_seed, drill.expected_npv)
            # Full draws remain in sample_map for optimization. Browser results need summaries only.
            drill.sample_npvs = []
            prospect_results.append(ProspectResult(prospect_id=prospect.prospect_id, simulation=drill, decision_comparison=comp, tornado=tornado))
            done += 1
            if progress: progress(done / total, f'{scenario.scenario_name}: simulated {prospect.name}')
        if progress: progress(done / total, f'{scenario.scenario_name}: optimizing allocations')
        optimized = optimize_portfolio(comparisons, sample_map, portfolio.capital_budget, portfolio.constraints,
                                       basins={p.prospect_id: p.basin for p in portfolio.prospects}, risk_aversion=portfolio.risk_aversion)
        for pid, decision in optimized.recommended_portfolio.allocation.items():
            robustness[pid][scenario.scenario_name] = decision
        results.append(ScenarioResult(scenario_name=scenario.scenario_name, optimization_result=optimized, prospect_results=prospect_results))
        done += 1
        if progress: progress(done / total, f'{scenario.scenario_name}: complete')
    for result in results:
        result.optimization_result.prospect_robustness = robustness
    return ScenarioComparison(scenario_results=results,
                              robust_prospects=[pid for pid, decisions in robustness.items() if len(set(decisions.values())) == 1],
                              fragile_prospects=[pid for pid, decisions in robustness.items() if len(set(decisions.values())) > 1])


def analyze(portfolio: PortfolioInput, progress=None) -> AnalysisResult:
    return AnalysisResult(model_version=MODEL_VERSION, input_hash=input_hash(portfolio), generated_at=datetime.now(timezone.utc).isoformat(),
                          input=portfolio, scenario_comparison=compare_scenarios(portfolio, portfolio.price_scenarios, progress), methodology=METHODOLOGY)
