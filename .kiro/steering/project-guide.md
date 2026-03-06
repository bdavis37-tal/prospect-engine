---
inclusion: auto
---

# Prospect Engine - Project Steering Guide

## Project Overview

**prospect-engine** is an open-source E&P (Exploration & Production) portfolio optimization engine that combines Monte Carlo simulation with capital allocation for interactive exploration of portfolio decisions.

### Core Purpose
Replace expensive consulting studies and brittle spreadsheet workflows with transparent, auditable, and fast portfolio optimization for oil & gas exploration and production.

### Key Capabilities
- Vectorized Monte Carlo simulation for prospect-level uncertainty
- Four-decision modeling: Drill, Farm-out, Divest, Defer
- Constrained portfolio optimization via MILP with efficient frontier sweep
- Multi-scenario analysis across commodity price decks
- Interactive visualization (2D maps, D3 charts, Three.js 3D subsurface scenes)

## Tech Stack

### Backend
- **Framework**: FastAPI with Pydantic validation
- **Language**: Python 3.11+
- **Core Libraries**: NumPy (vectorized computation), SciPy (optimization)
- **Testing**: pytest
- **Server**: uvicorn

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with semantic design tokens
- **Visualization**: D3.js (charts), Three.js (3D), Leaflet (maps)
- **UI Libraries**: Framer Motion (animations), cmdk (command palette), Radix UI (tooltips), TanStack Virtual (list virtualization)
- **Testing**: Vitest

### Infrastructure
- **Containerization**: Docker with docker-compose
- **API**: RESTful with OpenAPI/Swagger docs at `/docs`

## Project Structure

```
backend/
├── app/
│   ├── main.py                    # FastAPI entry point
│   ├── api/routes.py              # API endpoints
│   └── engine/                    # Core computation modules
│       ├── monte_carlo.py         # Vectorized simulation
│       ├── decline_curves.py      # Production decline modeling
│       ├── decision_modeler.py    # Decision economics
│       ├── portfolio_optimizer.py # MILP optimization
│       ├── price_models.py        # Commodity pricing
│       ├── prospect_economics.py  # NPV calculations
│       ├── scenario_engine.py     # Multi-scenario analysis
│       ├── sensitivity.py         # Tornado charts
│       ├── models.py              # Pydantic schemas
│       └── defaults.py            # Basin benchmarks
├── data/                          # JSON data files
├── scripts/                       # Utility scripts
└── tests/                         # pytest test suite

frontend/
├── src/
│   ├── components/
│   │   ├── charts/                # D3 visualizations
│   │   ├── three/                 # Three.js 3D rendering
│   │   ├── views/                 # Full-page views
│   │   ├── layout/                # CommandCenter, NavigationRail, ContextPanel, StatusBar, CommandBar, LandingHero, AppShell
│   │   ├── flow/                  # StepWizard guided input
│   │   ├── shared/                # ProspectCard, AnimatedMetricCard, VirtualizedProspectList, DemoErrorBoundary
│   │   └── inputs/                # Form components
│   ├── data/demos/                # Pre-computed demo data
│   ├── hooks/                     # React hooks (useCommandCenter, useViewTransition, useKeyboardShortcuts, useAnimatedValue, useUserPreferences, useDemoMode)
│   ├── lib/                       # Utilities, commandSearch, stepValidation
│   ├── types/                     # TypeScript types (command-center, demo, portfolio)
│   └── styles/                    # Tailwind CSS, design tokens, globals
└── public/                        # Static assets
```

## Development Workflow

### Starting the Application

**Docker (recommended)**:
```bash
docker compose up --build
```
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API docs: http://localhost:8000/docs

**Local Development**:
```bash
# Backend
cd backend
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

### Running Tests

```bash
# Backend tests
cd backend && pytest

# Frontend tests
cd frontend && npm test
```

### Environment Variables

- `VITE_API_URL`: Backend API base URL (default: `http://localhost:8000/api`)

## Coding Standards

### Python (Backend)

1. **Type Hints**: Use type hints for all function signatures
2. **Pydantic Models**: Define all API inputs/outputs with Pydantic for validation
3. **Vectorization**: Prefer NumPy array operations over Python loops for performance
4. **Docstrings**: Include docstrings for public functions explaining parameters and return values
5. **Error Handling**: Use FastAPI's HTTPException for API errors with appropriate status codes
6. **Testing**: Write pytest tests for all engine modules with fixtures in `tests/fixtures/`

**Example Pattern**:
```python
from pydantic import BaseModel
import numpy as np

class ProspectInput(BaseModel):
    name: str
    reserves_p50: float
    cost: float

def simulate_prospect(prospect: ProspectInput, n_iterations: int = 10000) -> np.ndarray:
    """Run Monte Carlo simulation for a prospect.
    
    Args:
        prospect: Prospect parameters
        n_iterations: Number of Monte Carlo iterations
        
    Returns:
        Array of NPV outcomes
    """
    # Vectorized computation here
    pass
```

### TypeScript (Frontend)

1. **Type Safety**: Define interfaces for all data structures in `src/types/`
2. **Component Structure**: Use functional components with TypeScript
3. **Hooks**: Extract reusable logic into custom hooks in `src/hooks/`
4. **Props**: Define explicit prop interfaces for all components
5. **Styling**: Use Tailwind utility classes with semantic design tokens (surface-base, surface-raised, decision-drill-base, etc.); avoid inline styles
6. **Design Tokens**: Use tokens from `styles/tokens.ts` for JS/D3 contexts; use Tailwind classes for component styling
7. **Animations**: Use Framer Motion for transitions; respect `prefers-reduced-motion` via design token overrides
8. **Testing**: Write Vitest tests for critical business logic

**Example Pattern**:
```typescript
import { motion } from "framer-motion";

interface ProspectCardProps {
  prospect: Prospect;
  decision: "drill" | "farmOut" | "divest" | "defer";
  onSelect: (id: string) => void;
}

export function ProspectCard({ prospect, decision, onSelect }: ProspectCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className="rounded-radius-md border border-surface-border-subtle bg-surface-raised p-4"
    >
      {/* Decision-colored accent bar, sparkline, probability badge */}
    </motion.div>
  );
}
```

## Frontend Architecture

### Command Center Layout
The main workspace uses a spatial command-center layout:
- **NavigationRail**: Vertical icon nav (left) with 5 views, keyboard shortcuts 1-5
- **Main Content**: Lazy-loaded views with crossfade transitions via `useViewTransition`
- **ContextPanel**: Slide-in prospect detail panel (right), resizable 280-480px
- **StatusBar**: Persistent portfolio metrics (bottom)
- **CommandBar**: ⌘K fuzzy search overlay using cmdk library

### Key Hooks
- `useCommandCenter`: Orchestrates all command-center state (active view, context panel, command bar, scenario, keyboard shortcuts, navigation queuing)
- `useViewTransition`: State machine for view transitions (idle → exit → enter → idle)
- `useKeyboardShortcuts`: Registers keyboard shortcuts with input suppression
- `useAnimatedValue`: rAF-based count-up animations with easeOutExpo
- `useUserPreferences`: localStorage persistence with clamping and fallbacks

### Design Token System
Three-layer token architecture:
1. `tailwind.config.ts` — Semantic Tailwind classes (surface-*, decision-*, text-*)
2. `styles/tokens.ts` — TypeScript constants for JS/D3/framer-motion
3. `styles/globals.css` — CSS custom properties with `prefers-reduced-motion` overrides

Decision colors: drill (emerald), farmOut (amber), divest (rose), defer (slate) — each with base/glow/muted variants.

## Key Architectural Patterns

### Vectorized Monte Carlo
- Draw all uncertain variables in batch NumPy arrays
- Compute economics in vectorized operations
- Avoid Python iteration overhead for performance

### Decision Framework
Each prospect evaluated under four mutually exclusive decisions:
- **Drill**: Full capital commitment, full exposure
- **Farm-out**: Reduced working interest, shared risk
- **Divest**: Sell prospect with transaction costs
- **Defer**: Hold prospect, no capital deployed

### Portfolio Optimization
- Mixed-integer linear programming (MILP)
- Efficient frontier sweep across risk tolerance λ ∈ [0,1]
- Objective: `maximize λ * E[NPV] - (1-λ) * StdDev[NPV]`

### Demo Data Pipeline
- Pre-computed demos run entirely in browser (no backend required)
- `generate_demo_data.py` creates `demo_input.json`, `demo_results.json`, `demo_3d_scene.json`
- Frontend imports these statically for demo mode

## Testing Guidelines

### Backend Testing
- Use pytest fixtures for test data (see `tests/fixtures/`)
- Test each engine module independently
- Validate numerical accuracy with known expected outputs
- Test edge cases (zero budget, single prospect, etc.)

### Frontend Testing
- Use Vitest for unit tests
- Test hooks and utility functions
- Validate data transformations and calculations
- Mock API calls in tests

## Common Tasks

### Adding a New Prospect Parameter
1. Update `models.py` Pydantic schema
2. Modify relevant engine module (e.g., `monte_carlo.py`)
3. Update frontend TypeScript types in `src/types/portfolio.ts`
4. Add input field in appropriate flow step component
5. Update tests with new parameter
6. Regenerate demo data if needed

### Adding a New Visualization
1. Create component in `src/components/charts/` (D3) or `src/components/shared/` (React)
2. Use D3.js for 2D charts, Three.js for 3D, Framer Motion for transitions
3. Define TypeScript interface for chart data
4. Use design tokens from `styles/tokens.ts` for colors and animation curves
5. Add to appropriate view component (lazy-loaded in CommandCenter)
6. Ensure responsive design with Tailwind semantic tokens

### Adding a New API Endpoint
1. Define Pydantic request/response models in `models.py`
2. Add route handler in `api/routes.py`
3. Implement business logic in appropriate engine module
4. Add tests in `tests/`
5. Update frontend API client in `src/lib/api.ts`
6. API docs auto-generate at `/docs`

## Performance Considerations

### Backend
- Use NumPy vectorization for all Monte Carlo operations
- Avoid Python loops in hot paths
- Profile with `cProfile` if performance issues arise
- Consider batch size for large portfolios

### Frontend
- Lazy load views with React.lazy + Suspense boundaries
- Memoize expensive calculations with `useMemo`
- Debounce user inputs that trigger recalculations (300ms in StepWizard)
- Use `useAnimatedValue` for smooth metric transitions (rAF-based)
- Virtualize prospect lists > 20 items with TanStack Virtual
- Use CSS transform and opacity for GPU-composited animations
- Optimize D3/Three.js render cycles
- Queue navigation during transitions (latest-wins, discard intermediates)

## Data Files

### Basin Benchmarks (`backend/app/data/basin_benchmarks.json`)
Default cost, decline, and productivity parameters by basin (Permian, GOM, etc.)

### Infrastructure (`backend/app/data/infrastructure.json`)
Platform and pipeline infrastructure for 3D visualization

### Price Scenarios (`backend/app/data/price_scenarios.json`)
Commodity price decks for scenario analysis

## License

Business Source License 1.1 — free for non-production use. Converts to Apache License 2.0 on the change date.

## Additional Resources

- Full architecture details: `ARCHITECTURE.md`
- Security audit: `AUDIT_REPORT.md`
- Change history: `CHANGELOG.md`
- API documentation: http://localhost:8000/docs (when backend running)
