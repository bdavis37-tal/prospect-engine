# Repository guidance

Prospect Engine is a Python 3.13 / FastAPI numerical engine with a React 18 / TypeScript workbench. Read README.md, ARCHITECTURE.md and ops/PRODUCTION.md before changing infrastructure or authentication.

- Active frontend: `frontend/src/workbench`. Retain `components/three` for optional sample scenes only. Use functional React components and strict TypeScript; no `any`.
- Backend API/auth/storage: `backend/app`; bounded queue worker: `python -m app.worker`; numerical model: `backend/app/engine`.
- All API models live in `engine/models.py`. Generate `frontend/src/types/api.generated.ts` using `backend/scripts/generate_types.py`; never hand-edit it. Run `--check` in validation.
- Use vectorized NumPy simulation, explicit units and petroleum exceedance percentiles. Enforce every accepted constraint. Never label an infeasible or timed-out allocation verified, alter frontier metrics, or replace uncertainty with an invented curve.
- Keep result snapshots immutable and separate from edited drafts. Include model version, input hash, seed, scenario and methodology in exports.
- Benchmark/demo assumptions are illustrative and unverified. Regenerate samples with `backend/scripts/generate_demo_data.py` when engine behavior changes. Keep the source/assumption labels visible.
- Visual direction: slate canvas #F3F6FA, white panels, ink #172B45, navy navigation #142B45, blue action #225ACB. The allocation table is primary; maps/3D are supporting views. Use shared decision constants and preserve keyboard/focus/mobile behavior.
- Run backend pytest, frontend tests/build, generated-type drift check, dependency scans and the Playwright production suite before committing engine/frontend changes. Inspect browser screenshots; structural validity alone is not visual QA.
- Production requires OIDC, HTTPS, durable storage and a running worker. Do not expose the local development identity. No credentials or prospect payloads in logs.
- Use conventional commits. Keep release evidence in IMPLEMENTATION.md and operations instructions aligned with code.
