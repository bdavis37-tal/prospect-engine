# prospect-engine

Open-source E&P portfolio optimization engine. Monte Carlo simulation meets capital allocation — interactive exploration portfolio decisions for everyone, not just $5M consulting engagements.

![Portfolio Map View](./frontend/public/og-image.png)

## The Problem

E&P capital allocation is often done through expensive consulting studies and brittle spreadsheet workflows that are hard to audit, hard to explain, and slow to iterate.

## The Solution

`prospect-engine` combines:
- vectorized Monte Carlo simulation for prospect uncertainty,
- decision modeling (drill, farm-out, divest, defer),
- constrained portfolio optimization with an efficient frontier,
- guided UI workflows and interactive visualization.

## Quick Start

```bash
docker compose up --build
```

Frontend: `http://localhost:5173`  
Backend: `http://localhost:8000/docs`

## Screenshots

- Portfolio map view: decision-coded prospect pins
- Prospect detail view: histogram, decline, tornado, waterfall
- Optimizer view: efficient frontier and allocation table
- Scenario dashboard: cross-scenario robustness heatmap

## Demo Walkthrough

1. Choose **Build Portfolio** in Quick Mode.
2. Add 5 Permian Basin prospects with defaults.
3. Set budget to `$40M` and discount rate to `10%`.
4. Select `Base + Bull + Bear` scenarios.
5. Run optimization and inspect recommendations, frontier shape, and scenario robustness.

## Tech Stack

- Frontend: React + TypeScript + Vite + Tailwind + D3 + Leaflet
- Backend: FastAPI + Pydantic + NumPy + SciPy
- Tests: pytest + Vitest
- Runtime: Docker / docker-compose

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md).

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for engine changes
4. Submit a pull request

## Roadmap (V2)

- Real-time commodity price feed ingestion
- Type curve library from public well data
- Probabilistic decline curve fitting from production history
- Multi-year capital planning with carry-forward constraints
- Public well database integrations (Enverus/IHS)

## License

Business Source License 1.1. See [LICENSE](./LICENSE).