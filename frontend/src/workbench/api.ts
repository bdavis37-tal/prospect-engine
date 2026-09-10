import type {
  AnalysisResult,
  JobRecord,
  PortfolioInput,
  PortfolioRecord,
} from "../types/api.generated";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fields: { field: string; message: string }[] = [],
  ) {
    super(message);
  }
}
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`/api${path}`, {
      ...init,
      credentials: "same-origin",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "prospect-engine",
        ...init.headers,
      },
    });
    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ detail: "The service is unavailable" }));
      throw new ApiError(
        `${error.detail ?? "Request failed"}${error.request_id ? ` (reference ${error.request_id.slice(0, 8)})` : ""}`,
        response.status,
        error.fields,
      );
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}
export const api = {
  me: () =>
    request<{ name: string; mode: string; workspace_id: string }>("/auth/me"),
  logout: () => request("/auth/logout", { method: "POST" }),
  portfolios: () => request<PortfolioRecord[]>("/portfolios"),
  save: (input: PortfolioInput, saved: PortfolioRecord | null) =>
    request<PortfolioRecord>(
      saved ? `/portfolios/${saved.id}` : "/portfolios",
      {
        method: saved ? "PUT" : "POST",
        body: JSON.stringify({ input, revision: saved?.revision ?? null }),
      },
    ),
  run: (portfolio_id: string, input: PortfolioInput, key: string) =>
    request<JobRecord>("/jobs", {
      method: "POST",
      headers: { "Idempotency-Key": key },
      body: JSON.stringify({ portfolio_id, input }),
    }),
  jobs: (id?: string) =>
    request<JobRecord[]>(
      `/jobs${id ? `?portfolio_id=${encodeURIComponent(id)}` : ""}`,
    ),
  job: (id: string) => request<JobRecord>(`/jobs/${id}`),
  result: (id: string) => request<AnalysisResult>(`/jobs/${id}/result`),
  cancel: (id: string) =>
    request<JobRecord>(`/jobs/${id}/cancel`, { method: "POST" }),
};
export const money = (value: number, compact = true) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 0,
  }).format(value);
export const percent = (value: number) => `${(value * 100).toFixed(1)}%`;
export const friendly = (value: string) =>
  value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
export function download(
  name: string,
  content: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function loadSample(
  id: "permian" | "gom",
): Promise<AnalysisResult> {
  const module =
    id === "permian"
      ? await import("../data/demos/permian/analysis.json")
      : await import("../data/demos/gom/analysis.json");
  return module.default as AnalysisResult;
}
