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

The app ships with two pre-computed demo portfolios that run entirely in the browser (no backend required):

**Permian Basin Growth Portfolio** — 15 onshore prospects, $150M budget
1. Launch the app and select **Permian Basin** from the demo selector.
2. Explore the **Portfolio Map** — colored pins with decision letters (D=Drill, F=Farm Out, S=Divest, W=Defer).
3. Click any prospect to see its **NPV distribution**, **tornado sensitivity**, and **decline curve**.
4. Switch to the **Optimizer** tab to view the **efficient frontier** and allocation breakdown.
5. Use the **Scenario Dashboard** to compare outcomes across 5 price scenarios.
6. Open the **Executive Summary** for a printable overview and CSV export.

**Gulf of Mexico Deepwater** — 8 offshore prospects, $600M budget, with subsea tiebacks and platform infrastructure in the 3D view.

## Tech Stack

- Frontend: React + TypeScript + Vite + Tailwind + D3 + Three.js
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