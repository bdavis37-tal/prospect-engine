import type {
  DecisionOption,
  DistributionParams,
  PortfolioInput,
  Prospect,
  ResourceDistribution,
} from "../types/api.generated";
import { basins } from "./defaults";
import { DECISION_LABELS } from "../lib/constants";
import type { DecisionType } from "../types/api.generated";
import { friendly } from "./api";
import { NumberField } from "./shared";

function Distribution({
  label,
  value,
  onChange,
}: {
  label: string;
  value: DistributionParams;
  onChange: (value: DistributionParams) => void;
}) {
  return (
    <fieldset>
      <legend>{label}</legend>
      <div className="form-grid three">
        {(["low", "base", "high"] as const).map((key) => (
          <NumberField
            key={key}
            label={friendly(key)}
            value={value[key]}
            min={0}
            onChange={(n) => onChange({ ...value, [key]: n })}
          />
        ))}
      </div>
      <label className="field">
        <span>Distribution</span>
        <select
          value={value.distribution_type}
          onChange={(e) =>
            onChange({
              ...value,
              distribution_type: e.target
                .value as DistributionParams["distribution_type"],
            })
          }
        >
          <option value="triangular">Triangular</option>
          {!label.startsWith("Recovery") && (
            <option value="lognormal">Lognormal</option>
          )}
        </select>
      </label>
    </fieldset>
  );
}
export function ProspectEditor({
  prospect: p,
  onChange,
  decision,
  onDecision,
}: {
  prospect: Prospect;
  onChange: (p: Prospect) => void;
  decision: DecisionOption | null;
  onDecision: (d: DecisionOption) => void;
}) {
  const set = <K extends keyof Prospect>(key: K, value: Prospect[K]) =>
    onChange({ ...p, [key]: value });
  const d: DecisionOption = decision ?? {
    decision_type: "farm_out",
    partner_carry_pct: 0.6,
    retained_working_interest: 0.5,
    expected_sale_price: null,
    probability_of_closing: 0.6,
    holding_cost_per_year: null,
    promoted_interest: null,
    lease_expiry_risk: null,
  };
  return (
    <div className="editor">
      <label className="field">
        <span>Prospect name</span>
        <input
          value={p.name}
          onChange={(e) => set("name", e.target.value)}
          maxLength={120}
        />
      </label>
      <div className="form-grid">
        <label className="field">
          <span>Basin</span>
          <select
            value={p.basin}
            onChange={(e) => set("basin", e.target.value as Prospect["basin"])}
          >
            {basins.map((b) => (
              <option key={b} value={b}>
                {friendly(b)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Hydrocarbon</span>
          <select
            value={p.hydrocarbon_type}
            onChange={(e) =>
              set(
                "hydrocarbon_type",
                e.target.value as Prospect["hydrocarbon_type"],
              )
            }
          >
            {["oil", "gas", "condensate", "mixed"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <NumberField
          label="Latitude (°)"
          value={p.latitude}
          min={-90}
          max={90}
          onChange={(n) => set("latitude", n)}
        />
        <NumberField
          label="Longitude (°)"
          value={p.longitude}
          min={-180}
          max={180}
          onChange={(n) => set("longitude", n)}
        />
      </div>
      <fieldset>
        <legend>Resource estimates · exceedance convention</legend>
        <p className="muted">
          P10 is the high outcome. Use recovery 1 when these values already
          represent recoverable volumes.
        </p>
        <div className="form-grid three">
          {(["p90", "p50", "p10"] as const).map((k) => (
            <NumberField
              key={k}
              label={k.toUpperCase()}
              min={0}
              value={p.resource_estimate[k]}
              onChange={(n) =>
                set("resource_estimate", { ...p.resource_estimate, [k]: n })
              }
            />
          ))}
        </div>
        <label className="field">
          <span>Resource unit</span>
          <select
            value={p.resource_estimate.unit}
            onChange={(e) =>
              set("resource_estimate", {
                ...p.resource_estimate,
                unit: e.target.value as ResourceDistribution["unit"],
              })
            }
          >
            {["MBOE", "MMBOE", "BOE", "MBO", "MMBO", "BO", "MCF", "BCF"].map(
              (u) => (
                <option key={u}>{u}</option>
              ),
            )}
          </select>
        </label>
      </fieldset>
      {(
        [
          "recovery_factor",
          "well_cost",
          "completion_cost",
          "opex_per_boe",
        ] as const
      ).map((k, i) => (
        <Distribution
          key={k}
          label={
            [
              "Recovery factor (0–1)",
              "Drilling cost ($ gross)",
              "Completion cost ($ gross)",
              p.resource_estimate.unit === "BCF" ||
              p.resource_estimate.unit === "MCF"
                ? "Operating cost ($/MCF)"
                : "Operating cost ($/BOE)",
            ][i]
          }
          value={p[k]}
          onChange={(v) => set(k, v)}
        />
      ))}
      <div className="form-grid">
        <NumberField
          label="Facility cost ($ gross)"
          min={0}
          value={p.facility_cost}
          onChange={(n) => set("facility_cost", n)}
        />
        {(["working_interest", "royalty_rate", "tax_rate"] as const).map(
          (k) => (
            <NumberField
              key={k}
              label={`${friendly(k)} (%)`}
              min={0}
              max={100}
              value={p[k] * 100}
              onChange={(n) =>
                onChange({
                  ...p,
                  [k]: n / 100,
                  net_revenue_interest:
                    k === "tax_rate" ? p.net_revenue_interest : null,
                })
              }
            />
          ),
        )}
        <NumberField
          label="Oil fraction (%)"
          min={0}
          max={100}
          value={p.oil_fraction * 100}
          onChange={(n) => set("oil_fraction", n / 100)}
        />
      </div>
      <label className="field">
        <span>Net revenue interest override (%)</span>
        <input
          type="number"
          min={0}
          max={p.working_interest * 100}
          value={
            p.net_revenue_interest === null ? "" : p.net_revenue_interest * 100
          }
          placeholder="Calculated from WI and royalty"
          onChange={(e) =>
            set(
              "net_revenue_interest",
              e.target.value === "" ? null : Number(e.target.value) / 100,
            )
          }
        />
      </label>
      <p className="muted">
        Net revenue interest is{" "}
        {(
          (p.net_revenue_interest ??
            p.working_interest * (1 - p.royalty_rate)) * 100
        ).toFixed(1)}
        %. Editing working interest or royalty recalculates it.
      </p>
      <fieldset>
        <legend>Production decline</legend>
        <div className="form-grid">
          {(
            Object.keys(
              p.decline_params,
            ) as (keyof Prospect["decline_params"])[]
          ).map((k) => (
            <NumberField
              key={k}
              label={friendly(k)}
              value={p.decline_params[k]}
              onChange={(n) =>
                set("decline_params", { ...p.decline_params, [k]: n })
              }
            />
          ))}
        </div>
        <p className="muted">
          Decline rates are fractions per year. Initial production is BOE/day or
          MCF/day to match resource units. Price decks must cover the full life.
        </p>
      </fieldset>
      <fieldset>
        <legend>Lease and infrastructure</legend>
        <div className="form-grid">
          {(
            [
              "water_depth_ft",
              "infrastructure_distance_miles",
              "lease_expiry_years",
            ] as const
          ).map((k) => (
            <label className="field" key={k}>
              <span>{friendly(k)}</span>
              <input
                type="number"
                min={0}
                value={p[k] ?? ""}
                placeholder="Unspecified"
                onChange={(e) =>
                  set(k, e.target.value === "" ? null : Number(e.target.value))
                }
              />
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Alternative terms</legend>
        <p className="muted">
          Retained interest is the fraction of original WI kept. Partner carry
          applies to retained drilling and completion costs.
        </p>
        <div className="form-grid">
          {(
            [
              "retained_working_interest",
              "partner_carry_pct",
              "probability_of_closing",
            ] as const
          ).map((k) => (
            <NumberField
              key={k}
              label={`${friendly(k)} (%)`}
              value={(d[k] ?? 0) * 100}
              min={0}
              max={100}
              onChange={(n) => onDecision({ ...d, [k]: n / 100 })}
            />
          ))}
          {(["expected_sale_price", "holding_cost_per_year"] as const).map(
            (k) => (
              <label className="field" key={k}>
                <span>{friendly(k)} ($)</span>
                <input
                  type="number"
                  min={0}
                  value={d[k] ?? ""}
                  placeholder="Model default"
                  onChange={(e) =>
                    onDecision({
                      ...d,
                      [k]:
                        e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </label>
            ),
          )}
        </div>
        <p className="muted">
          Default sale value is 8% of expected drill capital. Transaction cost
          is $500,000. Default annual holding cost is $500,000 ($2M when expiry
          is under 1.5 years).
        </p>
      </fieldset>
      <label className="field">
        <span>Assumption source</span>
        <textarea
          value={p.assumption_source}
          onChange={(e) => set("assumption_source", e.target.value)}
          maxLength={500}
        />
      </label>
      <label className="field">
        <span>Notes</span>
        <textarea
          value={p.notes ?? ""}
          onChange={(e) => set("notes", e.target.value)}
          maxLength={4000}
        />
      </label>
    </div>
  );
}
export function PortfolioSettings({
  input,
  onChange,
}: {
  input: PortfolioInput;
  onChange: (v: PortfolioInput) => void;
}) {
  const c = input.constraints;
  return (
    <div className="editor">
      <h2>Portfolio assumptions</h2>
      <div className="form-grid">
        <NumberField
          label="Capital budget ($)"
          value={input.capital_budget}
          min={1}
          onChange={(n) => onChange({ ...input, capital_budget: n })}
        />
        <NumberField
          label="Discount rate (%)"
          min={0}
          max={100}
          value={input.discount_rate * 100}
          onChange={(n) => onChange({ ...input, discount_rate: n / 100 })}
        />
        <NumberField
          label="Simulation iterations"
          min={100}
          max={10000}
          step={100}
          value={input.simulation_iterations}
          onChange={(n) => onChange({ ...input, simulation_iterations: n })}
        />
        <NumberField
          label="Random seed"
          min={0}
          max={4294967295}
          step={1}
          value={input.random_seed}
          onChange={(n) => onChange({ ...input, random_seed: n })}
        />
        <NumberField
          label="Downside penalty"
          min={0}
          max={20}
          value={input.risk_aversion}
          onChange={(n) => onChange({ ...input, risk_aversion: n })}
          hint="For each $1 of expected loss, subtract this amount from expected NPV when choosing a portfolio."
        />
      </div>
      <h3>Required decisions</h3>
      <p className="muted">
        These choices constrain the next run. Imported drill/defer mandates
        remain visible here.
      </p>
      {input.prospects.map((p) => (
        <label className="field" key={p.prospect_id}>
          <span>{p.name}</span>
          <select
            value={
              c.mandatory_drill?.includes(p.prospect_id)
                ? "drill"
                : c.mandatory_defer?.includes(p.prospect_id)
                  ? "defer"
                  : (c.fixed_decisions[p.prospect_id] ?? "")
            }
            onChange={(e) => {
              const fixed = { ...c.fixed_decisions };
              if (e.target.value)
                fixed[p.prospect_id] = e.target.value as DecisionType;
              else delete fixed[p.prospect_id];
              onChange({
                ...input,
                constraints: {
                  ...c,
                  fixed_decisions: fixed,
                  mandatory_drill:
                    c.mandatory_drill?.filter((id) => id !== p.prospect_id) ??
                    [],
                  mandatory_defer:
                    c.mandatory_defer?.filter((id) => id !== p.prospect_id) ??
                    [],
                },
              });
            }}
          >
            <option value="">Optimizer chooses</option>
            {Object.entries(DECISION_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
      ))}
      <h3>Capital constraints</h3>
      <p className="muted">
        Capital limits apply to expected capital. Leaving a field blank removes
        that constraint.
      </p>
      <div className="form-grid">
        {(
          [
            "min_prospects_drilled",
            "max_prospects_drilled",
            "max_single_prospect_pct_of_budget",
          ] as const
        ).map((k) => (
          <label className="field" key={k}>
            <span>
              {k === "max_single_prospect_pct_of_budget"
                ? "Maximum single prospect (% of budget)"
                : friendly(k)}
            </span>
            <input
              type="number"
              min={0}
              max={k === "max_single_prospect_pct_of_budget" ? 100 : 40}
              value={
                c[k] === null
                  ? ""
                  : (c[k] ?? 0) *
                    (k === "max_single_prospect_pct_of_budget" ? 100 : 1)
              }
              onChange={(e) =>
                onChange({
                  ...input,
                  constraints: {
                    ...c,
                    [k]:
                      e.target.value === ""
                        ? null
                        : Number(e.target.value) /
                          (k === "max_single_prospect_pct_of_budget" ? 100 : 1),
                  },
                })
              }
            />
          </label>
        ))}
      </div>
      <fieldset>
        <legend>Minimum basin allocation (% of total budget)</legend>
        <div className="form-grid">
          {[...new Set(input.prospects.map((p) => p.basin))].map((b) => (
            <label className="field" key={b}>
              <span>{friendly(b)}</span>
              <input
                type="number"
                min={0}
                max={100}
                value={(c.min_basin_allocation?.[b] ?? 0) * 100}
                onChange={(e) =>
                  onChange({
                    ...input,
                    constraints: {
                      ...c,
                      min_basin_allocation: {
                        ...c.min_basin_allocation,
                        [b]: Number(e.target.value) / 100,
                      },
                    },
                  })
                }
              />
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
