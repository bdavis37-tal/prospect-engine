import type { PortfolioInput } from "../types/api.generated";
import { newScenario } from "./defaults";
import { NumberField } from "./shared";
import { money } from "./api";
export function PriceEditor({
  input,
  onChange,
}: {
  input: PortfolioInput;
  onChange: (p: PortfolioInput) => void;
}) {
  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <h2>Commodity price assumptions</h2>
          <p>
            Editable annual price decks. USD per barrel and per MCF; no live
            market feed.
          </p>
        </div>
        <button
          disabled={input.price_scenarios.length >= 5}
          onClick={() =>
            onChange({
              ...input,
              price_scenarios: [
                ...input.price_scenarios,
                newScenario(`Scenario ${input.price_scenarios.length + 1}`),
              ],
            })
          }
        >
          Add scenario
        </button>
      </div>
      {input.price_scenarios.map((s, i) => (
        <details className="price-deck" key={i}>
          <summary>
            {s.scenario_name}{" "}
            <span>
              {money(s.oil_price_deck[0]?.price_per_unit ?? 0)}/bbl ·{" "}
              {s.oil_price_deck.length} years
            </span>
          </summary>
          <div className="form-grid">
            <label className="field">
              <span>Scenario name</span>
              <input
                value={s.scenario_name}
                onChange={(e) =>
                  onChange({
                    ...input,
                    price_scenarios: input.price_scenarios.map((v, j) =>
                      j === i ? { ...v, scenario_name: e.target.value } : v,
                    ),
                  })
                }
              />
            </label>
            <NumberField
              label="Annual volatility (%)"
              min={0}
              max={100}
              value={s.price_volatility * 100}
              onChange={(n) =>
                onChange({
                  ...input,
                  price_scenarios: input.price_scenarios.map((v, j) =>
                    j === i ? { ...v, price_volatility: n / 100 } : v,
                  ),
                })
              }
            />
            <NumberField
              label="Oil/gas log-return correlation"
              min={-1}
              max={1}
              value={s.price_correlation_oil_gas}
              onChange={(n) =>
                onChange({
                  ...input,
                  price_scenarios: input.price_scenarios.map((v, j) =>
                    j === i ? { ...v, price_correlation_oil_gas: n } : v,
                  ),
                })
              }
            />
          </div>
          <div className="table-scroll deck-table">
            <table>
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Oil ($/bbl)</th>
                  <th>Gas ($/MCF)</th>
                </tr>
              </thead>
              <tbody>
                {s.oil_price_deck.map((p, y) => (
                  <tr key={p.year}>
                    <td>{p.year}</td>
                    {(["oil_price_deck", "gas_price_deck"] as const).map(
                      (k) => (
                        <td key={k}>
                          <input
                            aria-label={`${s.scenario_name} year ${p.year} ${k === "oil_price_deck" ? "oil" : "gas"} price`}
                            type="number"
                            min={0.01}
                            value={s[k][y].price_per_unit}
                            onChange={(e) =>
                              onChange({
                                ...input,
                                price_scenarios: input.price_scenarios.map(
                                  (v, j) =>
                                    j === i
                                      ? {
                                          ...v,
                                          [k]: v[k].map((a, b) =>
                                            b === y
                                              ? {
                                                  ...a,
                                                  price_per_unit: Number(
                                                    e.target.value,
                                                  ),
                                                }
                                              : a,
                                          ),
                                        }
                                      : v,
                                ),
                              })
                            }
                          />
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="actions">
            <button
              disabled={s.oil_price_deck.length >= 50}
              onClick={() =>
                onChange({
                  ...input,
                  price_scenarios: input.price_scenarios.map((v, j) =>
                    j === i
                      ? {
                          ...v,
                          oil_price_deck: [
                            ...v.oil_price_deck,
                            {
                              year: v.oil_price_deck.length + 1,
                              price_per_unit:
                                v.oil_price_deck[v.oil_price_deck.length - 1]
                                  .price_per_unit,
                            },
                          ],
                          gas_price_deck: [
                            ...v.gas_price_deck,
                            {
                              year: v.gas_price_deck.length + 1,
                              price_per_unit:
                                v.gas_price_deck[v.gas_price_deck.length - 1]
                                  .price_per_unit,
                            },
                          ],
                        }
                      : v,
                  ),
                })
              }
            >
              Add year
            </button>
            <button
              disabled={input.price_scenarios.length <= 1}
              onClick={() =>
                onChange({
                  ...input,
                  price_scenarios: input.price_scenarios.filter(
                    (_, j) => j !== i,
                  ),
                })
              }
            >
              Remove scenario
            </button>
          </div>
        </details>
      ))}
    </section>
  );
}
