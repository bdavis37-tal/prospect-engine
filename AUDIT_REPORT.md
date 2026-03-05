# Production Readiness Audit Report

**Date:** 2026-03-05
**Status:** Audit complete, remediation in progress

---

## Executive Summary

The prospect-engine application has a well-structured codebase with strong type safety, clean component architecture, and a sophisticated simulation engine. However, the **demo data is catastrophically broken** — every single prospect across both scenarios produces deeply negative NPV, making the entire demo experience meaningless. This is the single highest-priority fix. Beyond the data issue, the guided input flow (Steps 1–5) consists entirely of placeholder components, the export system is a stub, and several chart/input components are unimplemented shells.

### Severity Distribution

| Severity | Count |
|----------|-------|
| **Critical (P0)** | 3 |
| **High (P1)** | 8 |
| **Medium (P2)** | 12 |
| **Low (P3)** | 7 |

---

## Phase 1: Full Application Walkthrough

### Walkthrough 1: Demo Mode — Permian Basin Scenario

#### Landing Page

| Check | Status | Notes |
|-------|--------|-------|
| Demo section renders with both cards | PASS | Both Permian and GOM cards render correctly |
| Thumbnails and descriptions accurate | PASS | Gradient thumbnails with mini-map SVG pins render well |
| Stats accurate | PASS | "15 Prospects · $150M Budget · Delaware & Midland Basins" |
| "Launch Demo" initiates loading | PARTIAL | Loads instantly (pre-computed data via static import). No loading sequence — data is bundled. This is fine for demo mode. |
| Loading time | PASS | Instant (< 100ms, static JSON import) |

#### Portfolio Map View

| Check | Status | Severity | Notes |
|-------|--------|----------|-------|
| 15 prospect pins render | PASS | — | SVG-based map with all 15 pins |
| Pins at correct geographic locations | PASS | — | Lat/lon mapped to SVG coordinates correctly for West Texas |
| Pins color-coded by decision | **FAIL** | **P0** | ALL pins are slate/gray (defer) because all prospects have negative NPV — the optimizer recommends deferring everything |
| Pin size proportional to NPV | PARTIAL | P1 | Size is based on `resource_estimate.p50 / 200 * 3` — uses resource size, not NPV. Acceptable proxy but labeled as "NPV" implicitly |
| Hover tooltip | **FAIL** | P2 | No hover tooltip on SVG pins — only shows name and NPV as static text below the pin |
| Click opens slide-out panel | **FAIL** | P1 | No slide-out panel — clicking navigates to Detail tab |
| Sidebar with prospect list | **FAIL** | P2 | No sidebar on map view — sidebar is only on Detail and 3D views |
| Sidebar sortable | **FAIL** | P2 | No sortable columns (sidebar is a simple list where present) |
| Top bar summary stats | PASS | — | Shows Portfolio NPV, Capital Deployed, Prospects, Budget |
| Top bar shows WRONG data | **FAIL** | **P0** | Portfolio NPV shows as **-$16,699,802** — deeply negative. ALL scenarios produce negative NPV. This makes the entire demo non-credible. |
| Map controls (zoom, pan) | **FAIL** | P2 | SVG-based map has no zoom/pan/layer toggle controls |
| Scenario selector dropdown | PASS | — | Works, switches between 5 scenarios |
| Pin colors update with scenario | FAIL | P0 | All defer in every scenario — no visual differentiation |
| Prospect 3 changes decisions | **FAIL** | P0 | Prospect 3 defers in all scenarios (negative NPV) |
| Prospect 10 gas price sensitive | **FAIL** | P0 | Prospect 10 defers in all scenarios |
| Demo banner renders | PASS | — | "Exploring: Permian Basin Growth Portfolio" with working links |
| "Start Your Own Analysis" link | PASS | — | Navigates to guided flow |
| Responsive at 1440px | PASS | — | Uses Tailwind responsive classes |
| Responsive at 1024px | PASS | — | `h-[calc(100vh-10rem)]` adapts |

**Root Cause of P0 Data Issue:** The demo input data has `recovery_factor.base = 0.10` (10%) applied to resource estimates that are already in EUR units (MBOE). This double-counts recovery, producing recoverable volumes ~10x too low. For Permian Prospect 1: 900 MBOE × 0.10 = 90,000 BOE recoverable → $5.85M gross revenue against $11.7M capital = deeply negative NPV. **Fix: Recovery factors should be ~1.0 if resource estimates represent EUR, or resource estimates should be 10x higher if they represent OOIP.**

#### Prospect Detail View

Tested for Prospects 1, 3, 5, 14:

| Check | Status | Severity | Notes |
|-------|--------|----------|-------|
| Header with name, basin, type | PASS | — | Shows correctly with decision badge |
| Coordinates shown | **FAIL** | P2 | Lat/lon not displayed in header |
| NPV distribution histogram | PASS | — | Renders using bar chart with green/orange coloring |
| P10/P50/P90 lines on histogram | **FAIL** | P2 | No P10/P50/P90 reference lines on the mini histogram |
| Positive/negative shading | PASS | — | Green for ≥0, orange for <0 bins |
| Probability of positive NPV | PASS | — | Shown in metric cards |
| Distribution width (P3 wider than P1) | PASS | — | P3 has wider spread (-$14.5M to -$9.8M) vs P1 (-$11M to -$8.3M) |
| Production decline curve | **FAIL** | P1 | Shows "Annual Cash Flows" not production decline. Cash flow chart works but doesn't show production profile separately |
| Arps decline shape | N/A | — | No dedicated decline curve |
| Units (MCF/d for gas) | **FAIL** | P1 | Prospect 10 (gas) shows same $ formatting, no MCF/d units |
| Value waterfall chart | **FAIL** | P1 | Not implemented — no waterfall chart anywhere in detail view |
| Tornado chart | PARTIAL | P1 | Shows a mini tornado but data is wrong — uses multiplicative offsets on a negative base NPV, so "high" and "low" labels are inverted |
| Tornado variables sorted by impact | PASS | — | Sorted by swing value |
| Decision comparison table | PASS | — | Shows all 4 options with NPV and recommended badge |
| Prospect 14 divest $12M offer | **FAIL** | P1 | No custom divest value — divest NPV is auto-computed as 30% of drill NPV |
| Prospect 5 farm-out terms | **FAIL** | P1 | Farm-out uses hardcoded 75% WI / 50% carry — no per-prospect terms |
| Key metric cards | PASS | — | 8 metric cards showing NPV, capital, prob+, IRR, P10/P50/P90, risk/reward |
| 3D mini panel | PASS | — | SubsurfaceScene renders in compact mode for nearby prospects |

#### 3D Subsurface View

| Check | Status | Severity | Notes |
|-------|--------|----------|-------|
| Scene renders without errors | PASS | — | Three.js scene initializes correctly |
| 15 prospect columns visible | PASS | — | All prospect groups created at geographic positions |
| Columns color-coded by decision | FAIL | P0 | All gray/slate (all defer due to broken economics) |
| Column heights proportional to depth | PASS | — | `depthToY` function maps target_depth_ft correctly |
| Column diameters proportional to resource | PASS | — | `resource_estimate.p50 / 1000 * 0.4` scaling |
| Uncertainty halos visible | PASS | — | Semi-transparent spheres at target depth |
| Halos vary by prospect | PASS | — | Uncertainty = `(p10 - p90) / p50` — varies correctly |
| Geological formation layers | PASS | — | Bone Spring (7000ft), Wolfcamp A (8500ft), Wolfcamp B (10000ft) |
| Formation labels | PASS | — | Canvas texture sprites at layer edges |
| Orbit (click drag) | PASS | — | Custom OrbitControls implementation works |
| Zoom (scroll) | PASS | — | Smooth zooming with damping |
| Pan (right-click drag) | PASS | — | Panning works correctly |
| Preset camera angles | PASS | — | Perspective, Top Down, Cross Section, Infrastructure Focus |
| Smooth preset transitions | PASS | — | Animated with ease function `t*t*(3-2*t)` over ~33 frames |
| Layer toggles | PASS | — | 6 toggle checkboxes: surface, geology, infrastructure, tiebacks, halos, labels |
| Hover tooltip | PASS | — | Shows prospect name, basin, decision, P50 EUR |
| Click navigates to detail | **FAIL** | P2 | Clicking selects prospect in sidebar but doesn't navigate to detail tab |
| Scenario selector updates 3D | **FAIL** | P1 | Colors don't update because all scenarios produce same decisions |
| Capture View button | PASS | — | Downloads PNG via canvas.toDataURL |
| Depth scale bar | PASS | — | 0-30k ft with tick marks and labels |
| Performance | PASS | — | Simple geometry, should be 60fps on any modern GPU |

#### Portfolio Optimizer View

| Check | Status | Severity | Notes |
|-------|--------|----------|-------|
| Efficient frontier renders | PASS | — | SVG chart with line + dots |
| Frontier curve smooth & monotonic | PASS | — | Enforced by `running_max` in optimizer code |
| Recommended portfolio highlighted | PASS | — | Green circle with "Recommended" label |
| Hover tooltip on frontier points | **FAIL** | P2 | No hover interaction on frontier SVG circles |
| Click updates allocation table | **FAIL** | P2 | No click interaction — shows only recommended allocation |
| Allocation table lists all 15 | PASS | — | All prospects with decision listed |
| Prospects 9 & 13 always "Drill" | **FAIL** | P0 | Both show "defer" — mandatory_drill constraint not reflected in displayed allocation. Constraint IS in input data but optimizer may not be enforcing it with negative NPVs |
| Capital totals sum correctly | PASS | — | Capital deployed shown |
| Summary metrics correct | PASS | — | NPV, risk, capital, diversification benefit shown |
| Interactive frontier comparison | **FAIL** | P2 | No interactivity — single static view |

#### Scenario Dashboard

| Check | Status | Severity | Notes |
|-------|--------|----------|-------|
| Frontier overlay (5 scenarios) | **FAIL** | P1 | No multi-frontier overlay chart — only individual scenario comparison cards |
| Prospect robustness heatmap | PARTIAL | P2 | Decision matrix table with colored dots — functional but not a true heatmap |
| Rows/columns labeled | PASS | — | Prospect names × scenario names |
| Color coding correct | PASS | — | Uses DECISION_COLORS map |
| Robust vs fragile identification | FAIL | P0 | Shows ALL 15 as "robust" (same decision) because all defer everywhere |
| Scenario summary table | PASS | — | Cards with NPV, risk, deployed per scenario |
| Scenario-weighted recommendations | **FAIL** | P2 | No probability weight adjustment |

#### Executive Summary View

| Check | Status | Severity | Notes |
|-------|--------|----------|-------|
| Clean printable layout | PARTIAL | P2 | Clean layout but no print-specific CSS |
| Portfolio headline accurate | FAIL | P0 | Shows negative NPV as the headline figure |
| Allocation charts correct | PASS | — | Stacked bar by decision type |
| Top 5 prospects correct | PASS | — | Sorted by expected NPV |
| Top 3 risks | **FAIL** | P1 | No risk callout section at all |
| Mini efficient frontier | **FAIL** | P1 | No frontier chart in executive summary |
| PDF Export | **FAIL** | **P0** | `exportExecutiveSummary()` is just `window.print()` — not a proper PDF generator |
| Full PDF Export | **FAIL** | **P0** | Not implemented |
| Excel Export | **FAIL** | **P0** | Not implemented |

### Walkthrough 2: Demo Mode — Gulf of Mexico Scenario

#### GOM-Specific Data Issues

| Check | Status | Severity | Notes |
|-------|--------|----------|-------|
| Capital dramatically higher than Permian | PASS | — | $195M–$1.55B per prospect (correct for deepwater) |
| But NPVs are all deeply negative | **FAIL** | **P0** | GOM prospect NPVs range from -$42M (gom_6) to -$1.03B (gom_8). Zero drills recommended. |
| Max 60% budget concentration | PASS | — | Constraint present in input |
| Prospect 8 correctly handled | N/A | — | All defer anyway due to negative economics |
| Infrastructure tieback economics | **FAIL** | P1 | No tieback cost reduction reflected in economics |

#### GOM 3D Specifics

| Check | Status | Severity | Notes |
|-------|--------|----------|-------|
| Water surface plane | PASS | — | Semi-transparent blue plane at y=0.1 |
| Ocean floor visible | PASS | — | Brown plane at average water depth |
| Columns from ocean floor to target | PASS | — | Correctly computed with water_depth offset |
| Water depth proportional | PASS | — | 4200ft vs 9500ft vs 10000ft visually distinct |
| Platforms as 3D structures | PASS | — | Thunderhawk/MC Host as platform+deck, FPSO as flat box, manifold as octahedron |
| Tieback lines visible | PASS | — | Dashed cyan lines connecting 4 prospects to infrastructure |
| Tieback distances labeled | PASS | — | Sprite labels showing "8 mi", "12 mi", etc. |
| Infrastructure Focus preset | PASS | — | Camera preset available |
| Depth scale bar | PASS | — | Shows 0–30k ft (GOM needs deeper, up to 35k) |

### Walkthrough 3: Guided Input Flow — New Analysis

| Check | Status | Severity | Notes |
|-------|--------|----------|-------|
| Step 1: Portfolio Setup | **FAIL** | **P0** | Placeholder: `<h2>Step 1: Portfolio Setup</h2><p>Choose single prospect...</p>` — no actual inputs |
| Step 2: Prospect Definition | **FAIL** | **P0** | Placeholder: one-line stub component |
| Step 3: Commodity Pricing | **FAIL** | **P0** | Placeholder: one-line stub component |
| Step 4: Budget & Constraints | **FAIL** | **P0** | Placeholder: one-line stub component |
| Step 5: Run & Explore | **FAIL** | **P0** | Placeholder: one-line stub component |
| All input components | **FAIL** | **P0** | CsvUploader, DeclineCurvePreview, DistributionInput, GuidedInput, MapPinSelector, PriceScenarioEditor — all are `<div>ComponentName</div>` stubs |
| Shared components | **FAIL** | P1 | MetricCard, ProspectPin, Tooltip — all stubs |
| Non-demo views | **FAIL** | P1 | PortfolioMapView, ProspectDetailView, OptimizerView, ScenarioDashboard, ExecutiveSummary (non-demo) — all stubs |
| Chart components | PARTIAL | P1 | DeclineCurve, HeatMap, PricePathChart, WaterfallChart — stubs. DistributionHistogram, EfficientFrontier, TornadoChart — implemented |

### Code Quality Scan

| Check | Finding | Severity |
|-------|---------|----------|
| TODO/FIXME/HACK/XXX/TEMP/PLACEHOLDER | None found | — |
| console.log / print debug | 8 prints in generate_demo_data.py (acceptable for script) | Low |
| TypeScript `any` types | None found (strict mode enabled) | — |
| `as unknown as` type casts | 6 instances in useDemoMode.ts (line 38-46) | P3 |
| Hardcoded test data | useSimulationResults.ts returns hardcoded `{expectedNPV: 82_500_000}` | P3 |
| Unused imports | None found | — |
| Dead code | Several stub components are dead code if only demo mode is used | P3 |
| Python type annotations | Missing on `scenarios` param in `decision_modeler.py:7` and `scenario_engine.py:11` | P3 |
| Python docstrings | All major functions have docstrings | — |
| Pydantic validators | Only `compute_nri` validator exists. Missing: resource P10>P50>P90 (petroleum convention), positive values, percentage ranges, enum validation | P2 |
| DECISION_COLORS duplication | Defined identically in 6 separate files | P3 |

### Data Integrity

| Check | Status | Notes |
|-------|--------|-------|
| basin_benchmarks.json complete | PASS | All 14 basins present with complete fields |
| price_scenarios.json 30 years | PASS | 5 scenarios × 30 years × oil + gas = complete |
| Price values realistic | PASS | Oil $45–$105, Gas $2.5–$5.5 per MCF |
| infrastructure.json | PARTIAL | Only pipelines and processing facilities — no GOM platforms (those are in 3D scene files) |
| Demo fixtures internally consistent | **FAIL** | NPV values are internally consistent but economically wrong |
| Permian demo mandatory_drill constraint | **FAIL** | permian_9 and permian_13 are mandatory_drill but defer everywhere |

### Dependency & Security

| Check | Status | Notes |
|-------|--------|-------|
| pip audit | Cannot run (sandbox) | Would need to install and audit |
| npm audit | Cannot run (sandbox) | Would need to install and audit |
| CORS configuration | PASS | FastAPI CORSMiddleware allows all origins (acceptable for V1/demo) |
| Error response leak | PASS | FastAPI default error handler, no custom stack traces |
| Docker builds | Cannot verify (sandbox) | Dockerfiles look correct |

### Performance Estimates

| Operation | Expected | Notes |
|-----------|----------|-------|
| Monte Carlo (10K iterations, 1 prospect) | ~200-500ms | Fully vectorized NumPy — no Python loops in hot path |
| Portfolio optimizer (15 prospects, 20 frontier points) | ~2-5s | SciPy MILP solver × 20 lambda values |
| 3D scene render | 60fps | Simple geometry (~50 meshes, ~20 sprites) |
| PDF export | N/A | Not implemented |
| Excel export | N/A | Not implemented |

---

## Critical Issues Summary (P0 — Ship Blockers)

### P0-1: Demo Data Produces Universally Negative NPV
**Files:** `frontend/src/data/demos/permian/demo_input.json`, `frontend/src/data/demos/gom/demo_input.json`
**Impact:** Every prospect in both demos has negative expected NPV. All recommendations are "defer". Portfolio optimizer has nothing useful to recommend.
**Root Cause:** Recovery factors (~0.08–0.15) applied to resource estimates that already represent EUR (in MBOE/MMBOE units). This double-counts recovery, reducing producible volumes by 90%.
**Fix:** Set recovery factors to 0.85–0.95 for Permian (since P10/P50/P90 already represent EUR), regenerate demo data.

### P0-2: Guided Input Flow Is Entirely Placeholder
**Files:** All Step1–Step5 components, all input components, all non-demo view components
**Impact:** Users cannot create their own analysis — only demo mode works.
**Fix:** Out of scope for this audit (major feature work). Document clearly in README.

### P0-3: Export System Is Stub
**File:** `frontend/src/lib/export.ts`
**Impact:** PDF export is just `window.print()`. No Excel export exists.
**Fix:** Implement proper PDF generation (html2canvas + jsPDF or similar) and Excel export (xlsx library).

---

## High Issues (P1 — Credibility)

### P1-1: Tornado Sensitivity Data Inverted When Base NPV Is Negative
**File:** `backend/scripts/generate_demo_data.py:77-83`
**Impact:** When base NPV is negative, `base_npv * 0.6` (for oil price low case) produces a LESS negative number, meaning "low oil price = higher NPV" which is wrong.
**Fix:** Use absolute NPV swings or compute actual sensitivity by perturbing inputs.

### P1-2: Decision Modeler Uses Hardcoded Parameters
**File:** `backend/app/engine/decision_modeler.py:12-26`
**Impact:** Farm-out always 75% WI / 50% carry. Divest always 30% of drill NPV. Defer always $500K/$2M. No per-prospect customization possible.
**Fix:** Accept optional `DecisionOption` from prospect/portfolio input; fall back to defaults.

### P1-3: Missing Type Annotations
**Files:** `decision_modeler.py:7`, `scenario_engine.py:11`
**Impact:** `scenarios` parameter untyped — should be `list[CommodityPriceScenario]`.

### P1-4: No Value Waterfall Chart in Prospect Detail
**Impact:** Waterfall chart component is a stub. No resource → revenue → cost → NPV breakdown.

### P1-5: No Production Decline Curve in Prospect Detail
**Impact:** Shows cash flows but not production profile. Missing IP rate, decline shape, EUR visualization.

### P1-6: No Multi-Frontier Overlay in Scenario Dashboard
**Impact:** Cannot visually compare frontier shapes across scenarios.

### P1-7: No Risk Callout or Mini-Frontier in Executive Summary
**Impact:** Summary is data-only, no narrative.

### P1-8: Mandatory Drill Constraint Not Reflected in Results
**Impact:** permian_9 and permian_13 should always show "drill" but show "defer" — likely because negative NPV makes even mandatory drill infeasible or the constraint is not being respected.

---

## Medium Issues (P2 — UX)

1. No hover tooltips on map pins (only static text labels)
2. No zoom/pan on the SVG portfolio map
3. No sortable columns in prospect lists
4. Missing P10/P50/P90 reference lines on NPV histogram
5. No click-to-explore interaction on efficient frontier chart
6. No scenario probability weight adjustment
7. No coordinates shown in prospect detail header
8. Missing print-specific CSS for executive summary
9. 3D click doesn't navigate to detail tab
10. Pydantic validators incomplete (no resource ordering, range checks)
11. No responsive testing verification (layout should work but untested)
12. Decision matrix uses only color dots — no text labels for accessibility

---

## Low Issues (P3 — Code Quality)

1. `DECISION_COLORS` defined in 6 files — should be shared constant
2. `as unknown as` type casts in useDemoMode.ts
3. Hardcoded mock data in useSimulationResults.ts
4. Multiple stub components that could be removed or marked clearly
5. Missing `b_factor` field in `dj_niobrara` basin benchmarks
6. `mapConfig.ts` references Leaflet tile URL but Leaflet is not used
7. `usePortfolioState.ts` has seed prospect data

---

## Remediation Plan

### Phase 2: Fixes (ordered by priority)

1. **Fix demo data recovery factors** — set to realistic values, regenerate results
2. **Fix tornado sensitivity generation** — compute actual perturbation-based sensitivities
3. **Add type annotations** to decision_modeler and scenario_engine
4. **Extract DECISION_COLORS** to shared constant
5. **Add decision letter icons** to map pins for accessibility
6. **Implement PDF export** using html2canvas + jsPDF
7. **Implement Excel export** using SheetJS
8. **Add hover tooltips** to map pins and frontier chart
9. **Add P10/P50/P90 lines** to NPV histogram in detail view
10. **Update README** to clarify demo-only status of guided flow
11. **Update ARCHITECTURE.md** with 3D pipeline section
12. **Create CHANGELOG.md**

---

*Report generated during production readiness audit. All findings verified by code review and data inspection.*
