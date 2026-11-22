import type { FrontierPoint, Prospect } from "../types/api.generated";
import { money } from "./api";
import { Decision } from "./Results";

export function AllocationComparison({
  recommended,
  selected,
  prospects,
}: {
  recommended: FrontierPoint;
  selected: FrontierPoint;
  prospects: Prospect[];
}) {
  const metrics = [
    ["Expected NPV", "expected_npv"],
    ["Expected loss", "expected_loss"],
    ["Capital deployed", "capital_deployed"],
  ] as const;
  const changed = prospects.filter(
    (p) =>
      recommended.allocation[p.prospect_id] !==
      selected.allocation[p.prospect_id],
  );
  return (
    <section
      className="panel allocation-comparison"
      aria-label="Allocation comparison"
    >
      <h2>Allocation comparison</h2>
      <div className="table-scroll">
        <table aria-label="Portfolio tradeoffs">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Recommended</th>
              <th>Selected</th>
              <th>Change</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map(([label, field]) => {
              const delta = selected[field] - recommended[field];
              return (
                <tr key={field}>
                  <th scope="row">{label}</th>
                  <td>{money(recommended[field], false)}</td>
                  <td>{money(selected[field], false)}</td>
                  <td>
                    {delta > 0 ? "+" : ""}
                    {money(delta, false)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <h3>Changed prospects ({changed.length})</h3>
      <div className="table-scroll">
        <table aria-label="Changed prospect decisions">
          <thead>
            <tr>
              <th>Prospect</th>
              <th>Recommended</th>
              <th>Selected</th>
            </tr>
          </thead>
          <tbody>
            {changed.map(({ prospect_id, name }) => (
              <tr key={prospect_id}>
                <th scope="row">{name}</th>
                <td>
                  <Decision value={recommended.allocation[prospect_id]} />
                </td>
                <td>
                  <Decision value={selected.allocation[prospect_id]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
