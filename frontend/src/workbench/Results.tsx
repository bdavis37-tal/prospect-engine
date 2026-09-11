import { useState } from "react";

import type {
  AnalysisResult,
  FrontierPoint,
  Prospect,
  ProspectResult,
  ScenarioResult,
} from "../types/api.generated";

import { money, percent } from "./api";

import { DECISION_LABELS } from "../lib/constants";

export function Decision({ value }: { value: string }) {
  return (
    <span className={`decision decision-${value}`}>
      {DECISION_LABELS[value] ?? value}
    </span>
  );
}

export function Metrics({ point }: { point: FrontierPoint }) {
  return (
    <dl className="metrics">
      <div>
        <dt>Expected NPV</dt>

        <dd>{money(point.expected_npv)}</dd>
      </div>

      <div>
        <dt>Capital deployed</dt>

        <dd>{money(point.capital_deployed)}</dd>
      </div>

      <div>
        <dt>Capital remaining</dt>

        <dd>{money(point.capital_remaining)}</dd>
      </div>

      <div>
        <dt>Probability of loss</dt>

        <dd>{percent(point.probability_of_loss)}</dd>
      </div>
    </dl>
  );
}

export function Frontier({
  scenario,

  onSelect,

  selected,
}: {
  scenario: ScenarioResult;

  onSelect: (p: FrontierPoint | null) => void;

  selected: FrontierPoint | null;
}) {
  const points = scenario.optimization_result.efficient_frontier;

  const rec = scenario.optimization_result.recommended_portfolio;

  const all = [...points, rec];

  const minX = 0,
    maxX = Math.max(...all.map((p) => p.expected_loss), 1) * 1.1;

  const minY = Math.min(0, ...all.map((p) => p.expected_npv)),
    maxY = Math.max(...all.map((p) => p.expected_npv), 1) * 1.1;

  const x = (v: number) => 90 + (v / maxX) * 600;

  const y = (v: number) => 245 - ((v - minY) / (maxY - minY)) * 200;

  return (
    <section className="panel frontier">
      <div className="section-head">
        <div>
          <h2>Return and downside</h2>

          <p>Choose an allocation to inspect the tradeoff.</p>
        </div>

        <button onClick={() => onSelect(null)}>Reset to recommendation</button>
      </div>

      <div className="table-scroll">
        <svg
          style={{ minWidth: 760 }}

          viewBox="0 0 760 320"

          role="img"

          aria-label="Efficient frontier: expected NPV versus expected loss in USD. Select allocations using the buttons below."
        >
          {Array.from({ length: 5 }, (_, i) => {
            const v = minY + ((maxY - minY) * i) / 4;

            return (
              <g key={i}>
                <line x1={90} x2={690} y1={y(v)} y2={y(v)} stroke="#dce4ed" />

                <text x={80} y={y(v) + 4} textAnchor="end">
                  {money(v)}
                </text>

                <text x={90 + (600 * i) / 4} y={270} textAnchor="middle">
                  {money((maxX * i) / 4)}
                </text>
              </g>
            );
          })}

          <polyline
            points={points

              .map((p) => `${x(p.expected_loss)},${y(p.expected_npv)}`)

              .join(" ")}

            fill="none"

            stroke="#225acb"

            strokeWidth={2}
          />

          {points.map((p, i) => (
            <circle
              key={i}

              cx={x(p.expected_loss)}

              cy={y(p.expected_npv)}

              r={5}

              fill="#225acb"
            >
              <title>{`Allocation ${i + 1}: ${money(p.expected_npv)} NPV, ${money(p.expected_loss)} expected loss`}</title>
            </circle>
          ))}

          <circle
            cx={x((selected ?? rec).expected_loss)}

            cy={y((selected ?? rec).expected_npv)}

            r={9}

            fill="white"

            stroke="#157554"

            strokeWidth={3}
          />

          <text x={390} y={307} textAnchor="middle">
            Expected loss ($)
          </text>

          <text x={90} y={22}>
            Expected NPV ($)
          </text>
        </svg>
      </div>

      <div className="allocation-options">
        {points.map((p, i) => (
          <button
            key={i}

            aria-pressed={selected === p}

            onClick={() => onSelect(p)}
          >
            Allocation {i + 1}
            <strong>{money(p.expected_npv)}</strong>
            <span>{money(p.expected_loss)} expected loss</span>
          </button>
        ))}
      </div>

      <p className="muted">
        Expected loss averages only the negative portion of NPV across all
        outcomes. The solver optimizes this portfolio measure; standard
        deviation is reported separately.
      </p>
    </section>
  );
}

export function ProspectEvidence({
  prospect,

  result,
}: {
  prospect: Prospect;

  result: ProspectResult;
}) {
  const sim = result.simulation;

  const max = Math.max(...sim.npv_histogram_data.map((b) => b.frequency), 1);

  return (
    <div className="evidence">
      <p className="muted">
        Drill economics · {prospect.resource_estimate.unit} resource basis
      </p>

      <dl className="metrics compact">
        <div>
          <dt>Expected drill NPV</dt>

          <dd>{money(sim.expected_npv)}</dd>
        </div>

        <div>
          <dt>Positive drill NPV</dt>

          <dd>{percent(sim.probability_positive_npv)}</dd>
        </div>
      </dl>

      <h3>Compare alternatives</h3>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Decision</th>

              <th>Capital</th>

              <th>Expected NPV</th>

              <th>P(positive)</th>
            </tr>
          </thead>

          <tbody>
            {Object.values(result.decision_comparison.options).map((o) => (
              <tr key={o.decision_type}>
                <td>
                  <Decision value={o.decision_type} />
                </td>

                <td>{money(o.capital_required)}</td>

                <td>{money(o.expected_npv)}</td>

                <td>{percent(o.probability_positive_npv)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>Drill NPV distribution</h3>

      <svg
        viewBox="0 0 440 170"

        role="img"

        aria-label={`NPV distribution: high P10 ${money(sim.npv_distribution.p10)}, median ${money(sim.npv_distribution.p50)}, low P90 ${money(sim.npv_distribution.p90)}`}
      >
        {sim.npv_histogram_data.map((b, i) => (
          <rect
            key={i}

            x={(i * 400) / sim.npv_histogram_data.length + 20}

            y={130 - (b.frequency / max) * 110}

            width={400 / sim.npv_histogram_data.length - 1}

            height={(b.frequency / max) * 110}

            fill={b.bin_end <= 0 ? "#b44c38" : "#225acb"}
          />
        ))}

        <text x={20} y={155}>
          {money(sim.npv_distribution.min)}
        </text>

        <text x={420} y={155} textAnchor="end">
          {money(sim.npv_distribution.max)}
        </text>
      </svg>

      <dl className="facts">
        <div>
          <dt>Low outcome (P90)</dt>

          <dd>{money(sim.npv_distribution.p90)}</dd>
        </div>

        <div>
          <dt>Median (P50)</dt>

          <dd>{money(sim.npv_distribution.p50)}</dd>
        </div>

        <div>
          <dt>High outcome (P10)</dt>

          <dd>{money(sim.npv_distribution.p10)}</dd>
        </div>
      </dl>

      <h3>Sensitivity to assumptions</h3>

      <p className="muted">
        Drill NPV with one input at 80% or 120% of its current value. Other
        draws are held constant.
      </p>

      <table>
        <thead>
          <tr>
            <th>Assumption</th>

            <th>80% input</th>

            <th>120% input</th>
          </tr>
        </thead>

        <tbody>
          {result.tornado.sensitivities.map((s) => (
            <tr key={s.variable_name}>
              <td>{s.variable_name}</td>

              <td>{money(s.low_case_npv)}</td>

              <td>{money(s.high_case_npv)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Source and assumptions</h3>

      <p>{prospect.assumption_source}</p>

      {prospect.notes && <p>{prospect.notes}</p>}
    </div>
  );
}

export function ScenarioComparison({
  analysis,

  onSelect,
}: {
  analysis: AnalysisResult;

  onSelect: (s: string) => void;
}) {
  return (
    <section className="panel">
      <h2>Scenario comparison</h2>

      <p className="muted">
        Recommendations are reoptimized under each price deck with the same
        budget and constraints.
      </p>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Scenario</th>

              <th>Expected NPV</th>

              <th>Capital</th>

              <th>Expected loss</th>

              <th>P(loss)</th>
            </tr>
          </thead>

          <tbody>
            {analysis.scenario_comparison.scenario_results.map((s) => {
              const p = s.optimization_result.recommended_portfolio;

              return (
                <tr key={s.scenario_name}>
                  <td>
                    <button
                      className="text-button"

                      onClick={() => onSelect(s.scenario_name)}
                    >
                      {s.scenario_name}
                    </button>
                  </td>

                  <td>{money(p.expected_npv)}</td>

                  <td>{money(p.capital_deployed)}</td>

                  <td>{money(p.expected_loss)}</td>

                  <td>{percent(p.probability_of_loss)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h3>Decisions that change</h3>

      <p>
        {analysis.scenario_comparison.fragile_prospects.length} of{" "}
        {analysis.input.prospects.length} prospects change their constrained
        allocation across scenarios.
      </p>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Prospect</th>

              {analysis.scenario_comparison.scenario_results.map((s) => (
                <th key={s.scenario_name}>{s.scenario_name}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {analysis.input.prospects.map((p) => (
              <tr key={p.prospect_id}>
                <td>{p.name}</td>

                {analysis.scenario_comparison.scenario_results.map((s) => (
                  <td key={s.scenario_name}>
                    <Decision
                      value={
                        s.optimization_result.recommended_portfolio.allocation[
                          p.prospect_id
                        ]
                      }
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function SpatialView({
  prospects,

  point,

  onSelect,
}: {
  prospects: Prospect[];

  point: FrontierPoint | null;

  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = prospects.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase()),
  );

  const minLat = Math.min(...prospects.map((p) => p.latitude)) - 0.1,
    maxLat = Math.max(...prospects.map((p) => p.latitude)) + 0.1,
    minLon = Math.min(...prospects.map((p) => p.longitude)) - 0.1,
    maxLon = Math.max(...prospects.map((p) => p.longitude)) + 0.1;

  const markers: {
    p: Prospect;

    x: number;

    y: number;

    anchorX: number;

    anchorY: number;
  }[] = [];

  for (const p of filtered) {
    const anchorX = 65 + ((p.longitude - minLon) / (maxLon - minLon)) * 660;

    const anchorY = 25 + ((maxLat - p.latitude) / (maxLat - minLat)) * 295;

    let x = anchorX,
      y = anchorY;

    for (
      let attempt = 0;
      attempt < 200 && markers.some((m) => Math.hypot(m.x - x, m.y - y) < 29);
      attempt++
    ) {
      const radius = 15 + Math.sqrt(attempt) * 6;

      x = Math.max(
        20,

        Math.min(775, anchorX + Math.cos(attempt * 2.4) * radius),
      );

      y = Math.max(
        20,

        Math.min(320, anchorY + Math.sin(attempt * 2.4) * radius),
      );
    }

    markers.push({ p, x, y, anchorX, anchorY });
  }

  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <h2>Prospect locations</h2>

          <p>
            Geographic coordinates; numbered markers link to the table. No
            inferred subsurface geometry.
          </p>
        </div>

        <label className="field">
          <span>Filter locations</span>

          <input value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
      </div>

      <div className="table-scroll">
        <svg
          style={{ minWidth: 800 }}

          viewBox="0 0 800 380"

          role="img"

          aria-label="Prospect latitude and longitude plot. Use the location table for details."
        >
          {Array.from({ length: 5 }, (_, i) => (
            <g key={i}>
              <line
                x1={65 + i * 165}

                x2={65 + i * 165}

                y1={25}

                y2={320}

                stroke="#dce4ed"
              />

              <line
                x1={65}

                x2={725}

                y1={25 + i * 73.75}

                y2={25 + i * 73.75}

                stroke="#dce4ed"
              />

              <text x={65 + i * 165} y={345} textAnchor="middle">
                {(minLon + ((maxLon - minLon) * i) / 4).toFixed(2)}°
              </text>

              <text x={55} y={30 + i * 73.75} textAnchor="end">
                {(maxLat - ((maxLat - minLat) * i) / 4).toFixed(2)}°
              </text>
            </g>
          ))}

          {markers.map(({ p, x, y, anchorX, anchorY }) => {
            const i = prospects.indexOf(p);

            return (
              <g key={p.prospect_id} transform={`translate(${x},${y})`}>
                <line
                  x1={0}

                  y1={0}

                  x2={anchorX - x}

                  y2={anchorY - y}

                  stroke="#53657b"
                />

                <circle
                  cx={anchorX - x}

                  cy={anchorY - y}

                  r={2}

                  fill="#172b45"
                />

                <circle r={12} fill="#225acb" stroke="white" strokeWidth={2} />

                <text
                  textAnchor="middle"

                  y={4}

                  fill="white"

                  style={{ fill: "white", fontSize: 13 }}
                >
                  {i + 1}
                </text>

                <title>{p.name}</title>
              </g>
            );
          })}

          <text x={395} y={372} textAnchor="middle">
            Longitude · north is up
          </text>
        </svg>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>#</th>

              <th>Prospect</th>

              <th>Latitude</th>

              <th>Longitude</th>

              <th>Decision</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((p) => (
              <tr key={p.prospect_id}>
                <td>{prospects.indexOf(p) + 1}</td>

                <td>
                  <button
                    className="text-button"

                    onClick={() => onSelect(p.prospect_id)}
                  >
                    {p.name}
                  </button>
                </td>

                <td>{p.latitude.toFixed(4)}</td>

                <td>{p.longitude.toFixed(4)}</td>

                <td>
                  {point ? (
                    <Decision value={point.allocation[p.prospect_id]} />
                  ) : (
                    "Not run"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
