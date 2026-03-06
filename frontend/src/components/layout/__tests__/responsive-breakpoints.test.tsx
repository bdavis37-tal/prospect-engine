/**
 * Integration tests for responsive breakpoints.
 *
 * **Property 10: Responsive Layout Integrity**
 * - NavigationRail collapses to icon-only at viewport < 768px
 * - ContextPanel auto-closes at viewport < 1024px
 * - StatusBar remains visible at all viewport sizes
 *
 * **Validates: Requirements 4.5, 5.5, 7.4, 17.5, 17.6**
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import * as fc from "fast-check";
import { NavigationRail } from "../NavigationRail";
import { ContextPanel } from "../ContextPanel";
import { StatusBar } from "../StatusBar";
import type { DemoData } from "../../../types/demo";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Resize the window and fire the resize event. */
function resizeWindow(width: number) {
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: width,
  });
  window.dispatchEvent(new Event("resize"));
}

/** Minimal DemoData fixture for ContextPanel tests. */
function makeDemoData(): DemoData {
  const prospect = {
    prospect_id: "p1",
    name: "Test Prospect",
    latitude: 31.5,
    longitude: -102.3,
    basin: "Permian",
    hydrocarbon_type: "oil",
    resource_estimate: { p10: 10, p50: 50, p90: 90, distribution_type: "lognormal", unit: "MMBOE" },
    recovery_factor: { base: 0.3, low: 0.2, high: 0.4, distribution_type: "triangular" },
    well_cost: { base: 5e6, low: 4e6, high: 7e6, distribution_type: "triangular" },
    completion_cost: { base: 3e6, low: 2e6, high: 4e6, distribution_type: "triangular" },
    facility_cost: 1e6,
    opex_per_boe: { base: 10, low: 8, high: 14, distribution_type: "triangular" },
    royalty_rate: 0.125,
    tax_rate: 0.21,
    working_interest: 1,
    decline_params: {
      initial_production_rate: 1000,
      initial_decline_rate: 0.65,
      b_factor: 1.2,
      terminal_decline_rate: 0.05,
      well_life_years: 30,
    },
  };

  const bins = Array.from({ length: 10 }, (_, i) => ({
    bin_start: (i - 5) * 1e6,
    bin_end: (i - 4) * 1e6,
    frequency: Math.max(1, 10 - Math.abs(i - 5)),
  }));

  const cashFlows = Array.from({ length: 30 }, () => 1e6);

  const prospectResult = {
    prospect_id: "p1",
    simulation: {
      prospect_id: "p1",
      n_iterations: 1000,
      npv_distribution: { mean: 5e7, std: 2e7, p10: 2e7, p50: 5e7, p90: 8e7, min: -1e7, max: 1.2e8 },
      irr_distribution: { mean: 0.15, std: 0.05, p10: 0.08, p50: 0.15, p90: 0.22, min: -0.1, max: 0.4 },
      payout_distribution: { mean: 3, std: 1, p10: 2, p50: 3, p90: 5, min: 1, max: 10 },
      probability_positive_npv: 0.75,
      expected_npv: 5e7,
      expected_irr: 0.15,
      npv_histogram_data: bins,
      irr_histogram_data: bins,
      capital_at_risk: 1e7,
      risk_reward_ratio: 5,
      annual_cash_flows_p10: cashFlows,
      annual_cash_flows_p50: cashFlows,
      annual_cash_flows_p90: cashFlows,
      sample_npvs: [1e7, 2e7, 3e7],
    },
    decision_comparison: {
      prospect_id: "p1",
      options: {
        drill: { decision_type: "drill" as const, expected_npv: 5e7, capital_required: 1e7, probability_positive_npv: 0.75, capital_efficiency: 5 },
        farm_out: { decision_type: "farm_out" as const, expected_npv: 2e7, capital_required: 5e6, probability_positive_npv: 0.8, capital_efficiency: 4 },
        divest: { decision_type: "divest" as const, expected_npv: 1e7, capital_required: 0, probability_positive_npv: 1, capital_efficiency: Infinity },
        defer: { decision_type: "defer" as const, expected_npv: 0, capital_required: 0, probability_positive_npv: 0, capital_efficiency: 0 },
      },
      recommendation: "drill" as const,
    },
    tornado: {
      base_case_npv: 5e7,
      sensitivities: [],
    },
  };

  return {
    input: {
      prospects: [prospect],
      capital_budget: 1.5e8,
      discount_rate: 0.1,
      simulation_iterations: 1000,
      price_scenarios: [],
      constraints: {},
    },
    results: {
      scenario_name: "Base Case",
      n_iterations: 1000,
      random_seed: 42,
      n_prospects: 1,
      capital_budget: 1.5e8,
      discount_rate: 0.1,
      prospect_results: [prospectResult],
      scenario_comparison: {
        scenario_results: [],
        robust_prospects: ["p1"],
        fragile_prospects: [],
      },
    },
    scene3d: {
      scene_type: "onshore",
      bounds: { lat_min: 30, lat_max: 33, lon_min: -104, lon_max: -100 },
      geological_layers: [],
      prospect_3d: [],
      infrastructure: [],
      pipelines: [],
      camera_presets: {},
    },
  } as DemoData;
}

// ---------------------------------------------------------------------------
// Mock matchMedia (needed for useUserPreferences / useAnimatedValue)
// ---------------------------------------------------------------------------

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Start at a wide viewport
  resizeWindow(1280);
});

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// NavigationRail — collapses to icon-only at < 768px
// Validates: Requirements 4.5, 17.5
// ---------------------------------------------------------------------------

describe("NavigationRail responsive collapse", () => {
  it("renders at wide viewport (≥ 768px) with md-sized buttons", () => {
    resizeWindow(1024);
    const { container } = render(
      <NavigationRail
        activeView="map"
        onNavigate={vi.fn()}
        prospectCount={5}
        hasAlerts={false}
      />,
    );

    const nav = container.querySelector("nav");
    expect(nav).toBeTruthy();
    // At ≥ 768px the rail uses md:w-16 (wider) and md:w-11 buttons
    // The nav element should have the md:w-16 class
    expect(nav!.className).toContain("md:w-16");
    // And the base (mobile) class w-14 for icon-only
    expect(nav!.className).toContain("w-14");
  });

  it("uses narrow icon-only width (w-14) at < 768px viewport", () => {
    resizeWindow(600);
    const { container } = render(
      <NavigationRail
        activeView="map"
        onNavigate={vi.fn()}
        prospectCount={5}
        hasAlerts={false}
      />,
    );

    const nav = container.querySelector("nav");
    expect(nav).toBeTruthy();
    // At < 768px, the base w-14 class applies (icon-only mode)
    // The md:w-16 class is present but doesn't activate below 768px
    expect(nav!.className).toContain("w-14");
  });

  it("renders all 5 navigation icons at any viewport width", () => {
    resizeWindow(500);
    render(
      <NavigationRail
        activeView="map"
        onNavigate={vi.fn()}
        prospectCount={0}
        hasAlerts={false}
      />,
    );

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(5);
  });
});

// ---------------------------------------------------------------------------
// ContextPanel — auto-closes at < 1024px
// Validates: Requirements 5.5, 17.6
// ---------------------------------------------------------------------------

describe("ContextPanel auto-close at narrow viewport", () => {
  it("calls onToggle when viewport is < 1024px and panel is open", () => {
    const onToggle = vi.fn();
    const demoData = makeDemoData();

    // Start at wide viewport
    resizeWindow(1280);

    render(
      <ContextPanel
        open={true}
        onToggle={onToggle}
        prospectId="p1"
        demoData={demoData}
        activeScenario="Base Case"
        onNavigateToProspect={vi.fn()}
      />,
    );

    // Shrink below 1024px
    act(() => {
      resizeWindow(800);
    });

    expect(onToggle).toHaveBeenCalled();
  });

  it("does NOT call onToggle when viewport is ≥ 1024px", () => {
    const onToggle = vi.fn();
    const demoData = makeDemoData();

    resizeWindow(1280);

    render(
      <ContextPanel
        open={true}
        onToggle={onToggle}
        prospectId="p1"
        demoData={demoData}
        activeScenario="Base Case"
        onNavigateToProspect={vi.fn()}
      />,
    );

    // Resize but stay above 1024px
    act(() => {
      resizeWindow(1100);
    });

    expect(onToggle).not.toHaveBeenCalled();
  });

  it("does NOT call onToggle when panel is already closed", () => {
    const onToggle = vi.fn();
    const demoData = makeDemoData();

    resizeWindow(1280);

    render(
      <ContextPanel
        open={false}
        onToggle={onToggle}
        prospectId={null}
        demoData={demoData}
        activeScenario="Base Case"
        onNavigateToProspect={vi.fn()}
      />,
    );

    act(() => {
      resizeWindow(600);
    });

    expect(onToggle).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// StatusBar — remains visible at all viewport sizes
// Validates: Requirements 7.4
// ---------------------------------------------------------------------------

describe("StatusBar visibility at all sizes", () => {
  const statusBarProps = {
    portfolioNPV: 82_500_000,
    capitalDeployed: 45_000_000,
    capitalRemaining: 105_000_000,
    prospectCount: 15,
    activeScenario: "Base Case",
    riskLevel: "moderate" as const,
    onScenarioChange: vi.fn(),
  };

  it("renders at wide viewport (1280px)", () => {
    resizeWindow(1280);
    render(<StatusBar {...statusBarProps} />);

    const footer = screen.getByRole("status");
    expect(footer).toBeTruthy();
    expect(footer.tagName).toBe("FOOTER");
  });

  it("renders at medium viewport (768px)", () => {
    resizeWindow(768);
    render(<StatusBar {...statusBarProps} />);

    const footer = screen.getByRole("status");
    expect(footer).toBeTruthy();
  });

  it("renders at narrow viewport (375px — mobile)", () => {
    resizeWindow(375);
    render(<StatusBar {...statusBarProps} />);

    const footer = screen.getByRole("status");
    expect(footer).toBeTruthy();
  });

  it("displays all six metrics at any viewport", () => {
    resizeWindow(500);
    render(<StatusBar {...statusBarProps} />);

    // Check for metric labels
    expect(screen.getByText("NPV")).toBeTruthy();
    expect(screen.getByText("Deployed")).toBeTruthy();
    expect(screen.getByText("Remaining")).toBeTruthy();
    expect(screen.getByText("Prospects")).toBeTruthy();
    expect(screen.getByText("Scenario")).toBeTruthy();
    expect(screen.getByText("Risk")).toBeTruthy();
  });

  it("displays the risk level text", () => {
    resizeWindow(500);
    render(<StatusBar {...statusBarProps} />);

    expect(screen.getByText("moderate")).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Property 10: Responsive Layout Integrity (fast-check)
// Validates: Requirements 4.5, 5.5, 7.4, 17.5, 17.6
// ---------------------------------------------------------------------------

describe("Property 10: Responsive Layout Integrity", () => {
  it("NavigationRail always renders 5 nav buttons regardless of viewport width", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 2560 }),
        (width) => {
          cleanup();
          resizeWindow(width);

          const { unmount } = render(
            <NavigationRail
              activeView="map"
              onNavigate={vi.fn()}
              prospectCount={5}
              hasAlerts={false}
            />,
          );

          const buttons = screen.getAllByRole("button");
          expect(buttons).toHaveLength(5);

          unmount();
        },
      ),
      { numRuns: 30 },
    );
  });

  it("ContextPanel triggers auto-close for any viewport width < 1024 when open", () => {
    const demoData = makeDemoData();

    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 1023 }),
        (width) => {
          cleanup();
          const onToggle = vi.fn();

          // Start wide so mount doesn't trigger close
          resizeWindow(1280);

          const { unmount } = render(
            <ContextPanel
              open={true}
              onToggle={onToggle}
              prospectId="p1"
              demoData={demoData}
              activeScenario="Base Case"
              onNavigateToProspect={vi.fn()}
            />,
          );

          // Shrink to the narrow width
          act(() => {
            resizeWindow(width);
          });

          expect(onToggle).toHaveBeenCalled();

          unmount();
        },
      ),
      { numRuns: 20 },
    );
  });

  it("ContextPanel does NOT auto-close for any viewport width ≥ 1024 when open", () => {
    const demoData = makeDemoData();

    fc.assert(
      fc.property(
        fc.integer({ min: 1024, max: 3840 }),
        (width) => {
          cleanup();
          const onToggle = vi.fn();

          resizeWindow(width);

          const { unmount } = render(
            <ContextPanel
              open={true}
              onToggle={onToggle}
              prospectId="p1"
              demoData={demoData}
              activeScenario="Base Case"
              onNavigateToProspect={vi.fn()}
            />,
          );

          // Fire resize at the same width (no change)
          act(() => {
            window.dispatchEvent(new Event("resize"));
          });

          expect(onToggle).not.toHaveBeenCalled();

          unmount();
        },
      ),
      { numRuns: 20 },
    );
  });

  it("StatusBar renders with role='status' at any viewport width", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 3840 }),
        (width) => {
          cleanup();
          resizeWindow(width);

          const { unmount } = render(
            <StatusBar
              portfolioNPV={50_000_000}
              capitalDeployed={20_000_000}
              capitalRemaining={30_000_000}
              prospectCount={10}
              activeScenario="Base Case"
              riskLevel="low"
              onScenarioChange={vi.fn()}
            />,
          );

          const footer = screen.getByRole("status");
          expect(footer).toBeTruthy();

          unmount();
        },
      ),
      { numRuns: 30 },
    );
  });
});
