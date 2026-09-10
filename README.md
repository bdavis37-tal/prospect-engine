# Prospect Engine

A capital-allocation workbench for exploration and production portfolios. Compare drill, farm-out, divest and defer decisions under uncertain resources, costs and commodity prices, inspect the economic evidence, and return to saved runs.

## What ships

- Allocation-first React interface with labeled navigation, scenario selection, searchable/sortable prospects, accessible detail dialogs, editable assumptions, required decisions, location tables, and a secondary 3D sample illustration.
- Validated CSV/JSON intake, explicit units and source labels, browser draft recovery, saved portfolio revisions, immutable analysis snapshots, stale-result indicators, run comparisons, JSON/CSV exports and printable reports.
- Reproducible Monte Carlo simulation and constrained mixed-integer optimization. The objective is **expected NPV minus downside penalty times expected loss**, where expected loss is the average of `max(-portfolio NPV, 0)` over all draws. No infeasible fallback is presented as an allocation.
- Same-origin API, durable SQLite queue and separate bounded worker. Production requires OIDC authentication and an explicit subject allowlist.

Samples are illustrative, precomputed with the same model and response contract as live analyses. Benchmark defaults are unverified assumptions and must be replaced with asset data before a capital decision.

## Run locally

Docker Desktop / Docker Engine with Compose:

```sh
docker compose up --build -d --wait
```

Open http://localhost:8080. The default stack is bound to loopback and uses a local development identity. It persists saved work in the `prospect-data` volume. `docker compose down` preserves that volume; do not add `-v` unless you intend to delete the data.

For source development use Python 3.13 and Node 24, with three terminals:

```sh
cd backend
python -m venv .venv
# Activate .venv (Windows: .venv\Scripts\Activate.ps1; Unix: source .venv/bin/activate)
pip install -r requirements.lock
pip install -e . --no-deps
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

```sh
cd backend
# Activate the same environment
python -m app.worker
```

```sh
cd frontend
npm ci
npm run dev
```

Vite at http://127.0.0.1:5173 proxies `/api` to port 8000. There is no browser-specific API hostname or CORS dependency. A backend without a worker can save portfolios but cannot execute analyses; `/api/ready` detects that condition.

## Verify

```sh
# Backend, from backend/
pip install pytest pip-audit
python -m pytest -q
python -m pip_audit -r requirements.lock
python scripts/generate_types.py --check

# Frontend, from frontend/
npm test
npm run build
node scripts/check-build.mjs
npm audit --audit-level=high
npx playwright install chromium
npm run test:e2e
```

Browser tests target the production Compose stack at port 8080. Set `E2E_BASE_URL` to test another local instance. They cover sample navigation, responsive detail, accessibility, live run completion, reload recovery, stale inputs, failed constraints, and export. GitHub Actions repeats these gates on Linux and builds/tests the actual containers.

When model logic changes, run `python scripts/generate_demo_data.py` from `backend/`. This regenerates both complete `analysis.json` samples and compatibility fixtures. Then regenerate the TypeScript API contract with `python scripts/generate_types.py`. Commit fixtures, types and lockfiles with the code.

## Model boundaries

All currency is USD. Gas uses $/MCF and 6 MCF/BOE when converting BOE gas volumes. P10/P50/P90 use the petroleum exceedance convention: P10 is the high outcome. The model normalizes decline profiles to sampled recoverable volumes, applies year-end discounting, working-interest operating costs and tax on positive operating income.

Commodity innovations are shared across prospects; resource/cost draws are independent between prospects. Alternative decisions and price scenarios use matched draws. No basin-level geological correlation, financing, depreciation, abandonment liability or future defer option value is implied. Review the full methodology embedded in every exported result. IRR summaries include only draws with a unique conventional IRR; payout summaries include only draws that pay out within modeled life. Coverage probabilities are exported alongside them.

Capital constraints apply to **expected** required capital, not a worst-case cash requirement. Farm-out carry applies to retained drilling/completion capital, not facilities. Divest includes a fixed transaction cost even if closing fails. Unsupported NGL decks, promoted interest and lease-expiry risk terms are rejected rather than silently ignored.

Workload limits: 40 prospects, 5 scenarios, 100-10,000 simulations, a bounded combined simulation horizon, 20 seconds per solver attempt and 300 seconds per queued analysis. A limit produces a failed run with no new verified allocation. Existing results remain visible as prior snapshots.

## Production deployment

See [the deployment, backup and rollback runbook](ops/PRODUCTION.md), [architecture](ARCHITECTURE.md), and [the implementation ledger](IMPLEMENTATION.md). Production configuration is intentionally separate from local development. Choose a host, HTTPS domain and OIDC provider before deploying externally; copying the local configuration to a public listener is not a production deployment.

Licensed under the repository's [Business Source License](LICENSE).
