import type {
  DistributionParams,
  PortfolioInput,
  Prospect,
} from "../types/api.generated";

export type Draft = {
  id: string;
  input: PortfolioInput;
  savedId?: string;
  baseRevision?: number;
  jobId?: string;
  sample?: "permian" | "gom" | null;
};

// Only upgrade editable inputs. Stored analysis JSON retains its original model and schema.
export function editableInput(input: PortfolioInput): PortfolioInput {
  return {
    ...input,
    prospects: input.prospects.map((prospect) => {
      const { opex_per_boe, ...p } = prospect as Prospect & {
        opex_per_boe?: DistributionParams;
      };
      const gasVolume = ["MCF", "BCF"].includes(p.resource_estimate.unit);
      if (!p.operating_cost && !opex_per_boe)
        throw Error("Missing operating cost in browser draft.");
      return {
        ...p,
        resource_estimate: {
          ...p.resource_estimate,
          distribution_type: "quantile_lognormal",
        },
        operating_cost: p.operating_cost ?? {
          ...opex_per_boe!,
          unit: gasVolume ? "USD/MCF" : "USD/BOE",
        },
      };
    }),
  };
}
