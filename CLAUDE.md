# CLAUDE.md

This file provides guidance for Claude Code when working on the prospect-engine codebase.

## Project Overview

E&P portfolio optimization engine with a FastAPI backend (Monte Carlo simulation, MILP optimization) and a React/TypeScript frontend (interactive visualizations, demo mode). The app evaluates oil & gas prospect portfolios under uncertainty using four decisions: Drill, Farm-out, Divest, Defer.

## Repository Layout

```
backend/           Python 3.11+ FastAPI service
  app/main.py      Entry point (FastAPI app)
  app/api/routes.py  Endpoints: GET /api/health, POST /api/optimize
  app/engine/      Core simulation & optimization modules
  data/            Static data (basin benchmarks, price decks, infrastructure)
  scripts/         Demo data generation
  tests/           pytest test suite
frontend/          React 18 + TypeScript + Vite
  src/components/  UI components (charts/, three/, views/, layout/, flow/, inputs/)
  src/data/        Pre-computed demo JSON fixtures
  src/hooks/       React hooks
  src/lib/         Utilities, constants, formatters, CSV export
  src/types/       TypeScript type definitions
  src/styles/      CSS + Tailwind
```

## Build & Run

```bash
# Docker (full stack)
docker compose up --build
# Frontend: http://localhost:5173  Backend: http://localhost:8000/docs

# Backend local
cd backend && pip install -e ".[dev]" && uvicorn app.main:app --reload --port 8000

# Frontend local
cd frontend && npm install && npm run dev
```

## Testing

```bash
# Backend — run from backend/
cd backend && pytest

# Frontend — run from frontend/
cd frontend && npm test
```

- Backend: 6 test modules in `backend/tests/` covering monte carlo, decline curves, prospect economics, portfolio optimizer, sensitivity, and demo data validation.
- Frontend: 2 test files (`App.test.ts`, `demo.test.ts`) using Vitest. Run with `npm test` (which calls `vitest run`).
- Always run both test suites before committing changes to engine or frontend code.
- TypeScript type checking: `cd frontend && npx tsc --noEmit`

## Code Style & Conventions

### Commit Messages

Use conventional commit format: `type: short description`

Common prefixes: `feat:`, `fix:`, `docs:`, `test:`, `chore:`, `refactor:`

Examples from this repo:
- `feat: add MILP optimizer, unit-aware economics, and interactive D3 chart components`
- `fix: production readiness audit — data, economics, UX, and docs`
- `docs: expand README with full project structure, API reference, and setup guide`

### Backend (Python)

- Python 3.11+ required
- Use Pydantic v2 models for all API input/output schemas (`app/engine/models.py`)
- NumPy vectorized operations for simulation — avoid Python loops over Monte Carlo iterations
- Dependencies: FastAPI, Pydantic, NumPy, SciPy (no pandas)
- Test with pytest; dev dependencies installed via `pip install -e ".[dev]"`
- pytest config in `pyproject.toml`: `pythonpath = ["app"]`, `testpaths = ["tests"]`

### Frontend (TypeScript/React)

- TypeScript strict mode enabled — do not use `any` type
- React 18 with functional components and hooks only (no class components)
- Vite for bundling; config in `vite.config.ts`
- Tailwind CSS for styling; custom colors defined in `tailwind.config.ts`:
  - `bg` (#0B1017), `panel` (#121A25), `drill` (#23D18B), `farm` (#2FA7FF), `divest` (#F97316), `defer` (#94A3B8)
- D3.js for 2D charts, Three.js (r128) for 3D subsurface scenes
- Shared constants (decision colors, labels, icons) live in `src/lib/constants.ts` — do not duplicate them in components
- Type definitions in `src/types/` — `demo.ts` for demo data, `portfolio.ts` for core domain types
- Environment variable: `VITE_API_URL` (defaults to `http://localhost:8000/api`)

### Key Patterns

- **Demo mode**: Pre-computed JSON fixtures in `frontend/src/data/` allow the UI to run without the backend. The `useDemoMode` hook loads these fixtures.
- **Decision colors/labels**: Always import from `src/lib/constants.ts`, never redefine inline.
- **Engine modules**: Each module in `backend/app/engine/` is self-contained. `monte_carlo.py` handles simulation, `portfolio_optimizer.py` handles MILP, `scenario_engine.py` orchestrates multi-scenario runs.
- **3D scenes**: `SubsurfaceScene.tsx` builds Three.js scenes from `demo_3d_scene.json` data. Custom `OrbitControls.ts` handles camera interaction.

## Environment

| Variable | Default | Used By |
|----------|---------|---------|
| `VITE_API_URL` | `http://localhost:8000/api` | Frontend (Vite) |

No `.env` file is committed. The Docker Compose file sets `VITE_API_URL` automatically.

## Important Notes

- The guided input workflow (`components/flow/Step1-5`) and several input/chart/shared components are stubs — they return placeholder text only. The demo mode views (`components/views/Demo*.tsx`) are the functional UI.
- `backend/scripts/generate_demo_data.py` regenerates demo fixtures. Run it when engine logic changes to keep demos in sync.
- The `AUDIT_REPORT.md` documents known production readiness issues with severity ratings.
- License is BSL 1.1 (non-production use only until change date).
