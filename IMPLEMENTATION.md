# Production implementation ledger

Scope: every recommendation in the 2026-09-10 production review. Branch: `codex/production-readiness`.

## Acceptance gates

- [x] Compiled Tailwind, valid tokens, readable and responsive production UI.
- [x] Validated complete inputs, row-level import feedback, editable benchmark assumptions and units.
- [x] Shared typed analysis contract for samples and real runs; every scenario and prospect result available.
- [x] Allocation-first workspace, labeled navigation, sortable/filterable table, explainable alternatives, overrides and comparison.
- [x] Accessible charts/maps/detail, keyboard use, reduced motion, no clipped content; visual browser QA.
- [x] Correct constrained optimizer; explicit infeasible/timeout statuses and independent feasibility validation.
- [x] Correct portfolio distributions and frontier, explicit risk objective, reproducible shared/independent uncertainty.
- [x] Versioned saved portfolios/runs, draft recovery, stale-result indication, exports with provenance.
- [x] Authenticated bounded jobs, progress/cancel/retry, quotas, structured errors and monitoring.
- [x] Production containers, lockfiles, same-origin API, persistent storage, tested backup/restore.
- [x] CI, browser regression/accessibility tests, numerical benchmarks, dependency scan, deployment and rollback procedure.
- [x] Fresh demo fixtures, lazy datasets/3D, measured production performance.
- [x] Final Linux container/CI check and release evidence.
- [ ] External deployment: host, HTTPS domain, OIDC registration and operational destinations have not been supplied.

## Design plan

The product is a capital-allocation workbench for E&P analysts. Use a compact labeled navy sidebar, pale blue-gray work surface, white tables, ink text, and blue actions. Palette: canvas #F3F6FA, surface #FFFFFF, ink #172B45, muted #53657B, action #225ACB, navigation #142B45. Decision colors remain semantic. Use Segoe UI/system sans-serif, 14–16px body, tabular numbers, 13px minimum chart labels. Tables carry density, with a single clear recommendation band above them. Keep maps and dark subsurface scenes secondary. All primary information is left aligned. Avoid promotional hero effects in the workbench.

Layout: header (portfolio/run/scenario/save/run), labeled navigation, main allocation table, accessible prospect drawer; compact frontier and run comparison beneath the table. Mobile uses horizontal navigation and full-width detail. No meaning is conveyed solely by color or animation.

This is tailored to comparing economic decisions; the table, constraints and downside explanations take priority over generic dashboard cards.

## Verification evidence — 2026-09-10

Local backend: 50 tests passing, including exhaustive optimizer comparison, infeasible/concentration/basin cases, random-stream checks, conventional IRR roots, authenticated ownership boundaries, worker timeouts, interrupted-run recovery and backup restoration. Three upstream deprecation warnings remain; they do not fail tests.

Frontend: 23 unit/fixture/import tests passing. Four browser scenarios pass, including zero axe violations on the sampled allocation/detail views, 1440/1024/768/390-pixel layouts, a real queued analysis, exact result recovery after reload, exports and a failed infeasible run. The result table uses the immutable run input; prospect input editing uses the draft. Sample markers are separated with leaders and a synchronized accessible table.

Build: initial JavaScript approximately 78 KB gzip (previously approximately 320 KB); lazy sample data and 3D chunks are excluded. The enforced initial-JS budget is 110 KB gzip. Tailwind is compiled. Both dependency scanners reported no known vulnerabilities on this date. The production Compose configuration parses.

The local Docker Linux engine did not start. Linux CI successfully built the production images, exercised the packaged browser workflow, created and restored a database backup, restarted the full stack, and verified saved-result fingerprints. [Verified CI run](https://github.com/bdavis37-tal/prospect-engine/actions/runs/34519975175). This ledger does not claim a live OIDC deployment, independent asset-data validation, multi-host availability or configured off-host operations.

The final additional browser test verifies recovery of an edited sample across new-portfolio navigation and reload. It passes against the compiled production build. Screenshots from that build are saved in `docs/screenshots/`.
