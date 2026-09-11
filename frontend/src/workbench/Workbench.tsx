import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import type {
  AnalysisResult,
  DecisionType,
  FrontierPoint,
  JobRecord,
  PortfolioInput,
  PortfolioRecord,
  Prospect,
} from "../types/api.generated";
import {
  api,
  ApiError,
  download,
  friendly,
  loadSample,
  money,
  percent,
} from "./api";
import { newPortfolio, newProspect } from "./defaults";
import { namedPortfolioInput } from "./portfolioNames";
import { ErrorBoundary } from "react-error-boundary";
import { Drawer } from "./shared";
import { PortfolioSettings, ProspectEditor } from "./Editors";
import {
  Decision,
  Frontier,
  Metrics,
  ProspectEvidence,
  ScenarioComparison,
  SpatialView,
} from "./Results";
import { csvTemplate, exportAllocation, importProspects } from "./importExport";
import { DECISION_LABELS } from "../lib/constants";
import { PriceEditor } from "./PriceEditor";
import "./workbench.css";

const Subsurface = lazy(() => import("./Subsurface"));
type View =
  | "overview"
  | "prospects"
  | "allocation"
  | "scenarios"
  | "reports"
  | "locations";
const views: View[] = [
  "overview",
  "prospects",
  "allocation",
  "scenarios",
  "reports",
  "locations",
];
const active = (job: JobRecord | null) =>
  !!job && ["queued", "running", "cancelling"].includes(job.status);
const fingerprint = (input: PortfolioInput) => JSON.stringify(input);

type Draft = {
  id: string;
  input: PortfolioInput;
  savedId?: string;
  jobId?: string;
  sample?: "permian" | "gom" | null;
};
export default function Workbench() {
  const draftId = useRef<string>(crypto.randomUUID());
  const workspaceEpoch = useRef(0);
  const pendingRun = useRef<{ fingerprint: string; key: string } | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [input, setInput] = useState<PortfolioInput | null>(null),
    [saved, setSaved] = useState<PortfolioRecord | null>(null),
    [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [sample, setSample] = useState<"permian" | "gom" | null>(null),
    [view, setView] = useState<View>("allocation"),
    [scenarioName, setScenarioName] = useState(""),
    [selectedPoint, setSelectedPoint] = useState<FrontierPoint | null>(null);
  const [portfolios, setPortfolios] = useState<PortfolioRecord[]>([]),
    [jobs, setJobs] = useState<JobRecord[]>([]),
    [job, setJob] = useState<JobRecord | null>(null),
    [runId, setRunId] = useState<string | null>(null);
  const [user, setUser] = useState<{
      name: string;
      mode: string;
      workspace_id: string;
    } | null>(null),
    [authReady, setAuthReady] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [fields, setFields] = useState<{ field: string; message: string }[]>([]),
    [notice, setNotice] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null),
    [editing, setEditing] = useState(false),
    [settings, setSettings] = useState(false),
    [spatial3d, setSpatial3d] = useState(false);
  const [query, setQuery] = useState(""),
    [decisionFilter, setDecisionFilter] = useState("all"),
    [sort, setSort] = useState<"name" | "npv" | "capital">("npv"),
    [descending, setDescending] = useState(true),
    [baseline, setBaseline] = useState<AnalysisResult | null>(null);
  const [baselineId, setBaselineId] = useState(""),
    [importErrors, setImportErrors] = useState<string[]>([]);
  const reportError = (e: unknown) => {
    setError(e instanceof Error ? e.message : "An unexpected error occurred");
    setFields(e instanceof ApiError ? e.fields : []);
    if (e instanceof ApiError && e.fields.length) {
      const match = e.fields[0].field.match(/prospects\.(\d+)/);
      if (match && input?.prospects[Number(match[1])]) {
        setSelectedId(input.prospects[Number(match[1])].prospect_id);
        setEditing(true);
      } else if (e.fields[0].field.includes("price_scenarios"))
        setView("scenarios");
      else setSettings(true);
    }
  };
  const navigate = (v: View) => {
    setView(v);
    const params = new URLSearchParams();
    params.set("view", v);
    if (runId) params.set("run", runId);
    history.pushState(null, "", `#${params}`);
  };
  const openResult = (result: AnalysisResult, id: string | null) => {
    setAnalysis(result);
    setScenarioName(
      result.scenario_comparison.scenario_results[0]?.scenario_name ?? "",
    );
    setSelectedPoint(null);
    setRunId(id);
    setView("allocation");
  };
  useEffect(() => {
    api
      .me()
      .then(async (identity) => {
        setUser(identity);
        const list = await api.portfolios();
        setPortfolios(list);
        if (workspaceEpoch.current > 0) return;
        const nameDraft = (d: Draft): Draft => ({
          ...d,
          input: namedPortfolioInput(d.input, list.find((p) => p.id === d.savedId)?.name),
        });
        const recoveredDrafts: Draft[] = JSON.parse(
          localStorage.getItem(`prospect-drafts:${identity.workspace_id}`) ?? "[]",
        );
        const namedDrafts = recoveredDrafts.map(nameDraft);
        setDrafts(namedDrafts);
        localStorage.setItem(`prospect-drafts:${identity.workspace_id}`, JSON.stringify(namedDrafts));
        const raw = localStorage.getItem(
          `prospect-draft:${identity.workspace_id}`,
        );
        if (raw) {
          try {
            const d = nameDraft(JSON.parse(raw));
            if (d.input?.prospects && d.input?.constraints) {
              draftId.current = d.id ?? crypto.randomUUID();
              setInput(d.input);
              setSample(d.sample ?? null);
              if (d.sample && !d.jobId)
                openResult(await loadSample(d.sample), null);
              setSaved(list.find((p) => p.id === d.savedId) ?? null);
              if (d.jobId) {
                const current = await api.job(d.jobId);
                setJob(current);
                if (current.status === "completed") {
                  openResult(await api.result(d.jobId), d.jobId);
                }
              }
            }
          } catch {
            setNotice(
              "The saved browser draft could not be recovered. Open a saved portfolio.",
            );
          }
        }
        const run = new URLSearchParams(location.hash.slice(1)).get("run");
        if (run && !raw) {
          const r = await api.result(run);
          setInput(r.input);
          openResult(r, run);
          const j = await api.job(run);
          setJob(j);
          setSaved(list.find((p) => p.id === j.portfolio_id) ?? null);
        }
      })
      .catch((e) => {
        if (!(e instanceof ApiError && e.status === 401))
          setNotice(
            "Saved work is unavailable. You can still explore sample portfolios.",
          );
      })
      .finally(() => setAuthReady(true));
  }, []);
  useEffect(() => {
    const pop = () => {
      const v = new URLSearchParams(location.hash.slice(1)).get("view");
      if (views.includes(v as View)) setView(v as View);
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);
  useEffect(() => {
    if (
      authReady &&
      user &&
      input &&
      (!sample ||
        saved ||
        fingerprint(input) !== fingerprint(analysis?.input ?? input))
    ) {
      try {
        const current: Draft = {
          id: draftId.current,
          input,
          savedId: saved?.id,
          jobId: job?.id,
          sample,
        };
        localStorage.setItem(
          `prospect-draft:${user.workspace_id}`,
          JSON.stringify(current),
        );
        const previous: Draft[] = JSON.parse(
          localStorage.getItem(`prospect-drafts:${user.workspace_id}`) ?? "[]",
        );
        const next = [
          current,
          ...previous.filter(
            (d) => d.id !== current.id && (!saved || d.savedId !== saved.id),
          ),
        ].slice(0, 20);
        localStorage.setItem(
          `prospect-drafts:${user.workspace_id}`,
          JSON.stringify(next),
        );
        setDrafts(next);
      } catch {
        setNotice(
          "Browser draft storage is full. Save your portfolio to preserve changes.",
        );
      }
    }
  }, [authReady, user, input, saved, job, sample, analysis]);
  useEffect(() => {
    if (!saved || !user) return;
    api.jobs(saved.id).then(setJobs).catch(reportError);
  }, [saved, user, job?.status]);
  useEffect(() => {
    if (!active(job)) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const j = await api.job(job!.id);
        if (stopped) return;
        if (j.status === "completed") {
          const result = await api.result(j.id);
          if (stopped) return;
          setSample(null);
          openResult(result, j.id);
          setNotice("Analysis complete. Results are saved.");
          setError("");
        } else if (j.status === "failed") {
          setError(j.message);
        } else if (active(j)) {
          timer = setTimeout(poll, 1200);
        }
        setJob(j);
      } catch (e) {
        if (!stopped) {
          reportError(e);
          timer = setTimeout(poll, 4000);
        }
      }
    };
    timer = setTimeout(poll, 500);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [job?.id, job?.status]);
  const scenario =
    analysis?.scenario_comparison.scenario_results.find(
      (s) => s.scenario_name === scenarioName,
    ) ?? analysis?.scenario_comparison.scenario_results[0];
  const point =
    selectedPoint ??
    scenario?.optimization_result.recommended_portfolio ??
    null;
  const stale =
    !!analysis && !!input && fingerprint(analysis.input) !== fingerprint(input);
  const dirty =
    !!input && (!saved || fingerprint(input) !== fingerprint(saved.input));
  const selectedDraft = input?.prospects.find(
    (p) => p.prospect_id === selectedId,
  );
  const selected =
    selectedDraft ??
    analysis?.input.prospects.find((p) => p.prospect_id === selectedId);
  const tableInput = view === "prospects" ? input : (analysis?.input ?? input);
  const selectedEvidence = scenario?.prospect_results.find(
    (p) => p.prospect_id === selectedId,
  );
  const baselineScenario = baseline?.scenario_comparison.scenario_results.find(
    (s) => s.scenario_name === scenario?.scenario_name,
  );
  const rows = useMemo(() => {
    if (!tableInput) return [];
    return tableInput.prospects
      .map((p) => {
        const d =
          view === "prospects" && stale
            ? undefined
            : point?.allocation[p.prospect_id];
        const r = scenario?.prospect_results.find(
          (r) => r.prospect_id === p.prospect_id,
        );
        const option = d ? r?.decision_comparison.options[d] : undefined;
        return { p, d, option };
      })
      .filter(
        (r) =>
          `${r.p.name} ${r.p.basin}`
            .toLowerCase()
            .includes(query.toLowerCase()) &&
          (decisionFilter === "all" || r.d === decisionFilter),
      )
      .sort((a, b) => {
        const v =
          sort === "name"
            ? a.p.name.localeCompare(b.p.name)
            : sort === "npv"
              ? (a.option?.expected_npv ?? 0) - (b.option?.expected_npv ?? 0)
              : (a.option?.capital_required ?? 0) -
                (b.option?.capital_required ?? 0);
        return descending ? -v : v;
      });
  }, [
    tableInput,
    point,
    scenario,
    query,
    decisionFilter,
    sort,
    descending,
    view,
    stale,
  ]);
  const mutate = (value: PortfolioInput) => {
    setInput(value);
    pendingRun.current = null;
    setFields([]);
  };
  const editProspect = (p: Prospect) => {
    if (input)
      mutate({
        ...input,
        prospects: input.prospects.map((old) =>
          old.prospect_id === p.prospect_id ? p : old,
        ),
      });
  };
  const save = async () => {
    if (!input) throw Error("No portfolio selected");
    const p = await api.save(input, saved);
    setSaved(p);
    setInput(p.input);
    setPortfolios(await api.portfolios());
    setNotice("Portfolio saved.");
    return p;
  };
  const run = async () => {
    if (!input) return;
    setBusy(true);
    setError("");
    setFields([]);
    try {
      const p = await save();
      const snapshot = fingerprint(p.input);
      if (pendingRun.current?.fingerprint !== snapshot)
        pendingRun.current = {
          fingerprint: snapshot,
          key: crypto.randomUUID(),
        };
      const j = await api.run(p.id, p.input, pendingRun.current.key);
      pendingRun.current = null;
      setJob(j);
      setNotice(
        "Analysis queued. You can continue reviewing the current results.",
      );
    } catch (e) {
      reportError(e);
    } finally {
      setBusy(false);
    }
  };
  const loadDemo = async (id: "permian" | "gom") => {
    workspaceEpoch.current++;
    setBusy(true);
    setError("");
    try {
      const r = await loadSample(id);
      draftId.current = crypto.randomUUID();
      setQuery("");
      setDecisionFilter("all");
      setBaselineId("");
      setInput(structuredClone(r.input));
      openResult(r, null);
      setSample(id);
      setSaved(null);
      setJob(null);
      setBaseline(null);
      setJobs([]);
      setNotice("");
    } catch (e) {
      reportError(e);
    } finally {
      setBusy(false);
    }
  };
  const openSaved = async (p: PortfolioRecord) => {
    workspaceEpoch.current++;
    draftId.current = p.id;
    setQuery("");
    setDecisionFilter("all");
    setBaselineId("");
    const draft = drafts.find((d) => d.savedId === p.id);
    setInput(draft?.input ?? p.input);
    setSaved(p);
    setSample(null);
    setAnalysis(null);
    setJob(null);
    setRunId(null);
    setBaseline(null);
    setView("prospects");
    try {
      const list = await api.jobs(p.id);
      setJobs(list);
      const j = list.find((j) => j.status === "completed");
      if (j) {
        openResult(await api.result(j.id), j.id);
        setJob(j);
      }
      const pending = list.find(active);
      if (pending) setJob(pending);
    } catch (e) {
      reportError(e);
    }
  };
  const perform = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      reportError(e);
    } finally {
      setBusy(false);
    }
  };
  async function importFile(file: File) {
    setImportErrors([]);
    if (file.size > 2_000_000) {
      setImportErrors(["File exceeds 2 MB."]);
      return;
    }
    try {
      const text = await file.text();
      if (file.name.endsWith(".csv")) {
        const r = importProspects(text);
        setImportErrors(r.errors);
        if (!r.errors.length) {
          mutate({
            ...input!,
            prospects: r.prospects,
            constraints: newPortfolio().constraints,
            decisions: null,
          });
          setNotice(
            "Imported prospects. Review all defaults and assumptions before running.",
          );
        }
      } else {
        const parsed = JSON.parse(text);
        const candidate = parsed.input ?? parsed;
        if (
          !Array.isArray(candidate.prospects) ||
          !Array.isArray(candidate.price_scenarios)
        )
          throw Error("Use an exported portfolio JSON file.");
        const validated = await api.save(candidate, null);
        setInput(validated.input);
        setSaved(validated);
        setSample(null);
        setAnalysis(null);
        setPortfolios(await api.portfolios());
        setNotice("Imported and saved portfolio.");
      }
    } catch (e) {
      reportError(e);
    }
  }
  const startNew = () => {
    workspaceEpoch.current++;
    draftId.current = crypto.randomUUID();
    pendingRun.current = null;
    setInput(newPortfolio());
    setAnalysis(null);
    setSaved(null);
    setSample(null);
    setJob(null);
    setRunId(null);
    setView("prospects");
    setQuery("");
    setDecisionFilter("all");
    setBaseline(null);
    setBaselineId("");
    setJobs([]);
    setError("");
    setNotice("");
    setSelectedId(null);
    history.replaceState(null, "", "#view=prospects");
  };
  const recoverDraft = async (d: Draft) => {
    workspaceEpoch.current++;
    draftId.current = d.id;
    setInput(d.input);
    setSaved(portfolios.find((p) => p.id === d.savedId) ?? null);
    setSample(null);
    setAnalysis(null);
    setJob(null);
    setRunId(null);
    setView("prospects");
    setQuery("");
    setDecisionFilter("all");
    if (d.jobId) {
      const j = await api.job(d.jobId);
      setJob(j);
      if (j.status === "completed") openResult(await api.result(j.id), j.id);
    } else if (d.sample) {
      openResult(await loadSample(d.sample), null);
      setSample(d.sample);
    }
  };
  const exportCsv = () => {
    if (!input || !point || !scenario || !analysis) return;
    const options = Object.fromEntries(
      scenario.prospect_results.map((r) => {
        const o =
          r.decision_comparison.options[point.allocation[r.prospect_id]];
        return [
          r.prospect_id,
          { capital: o.capital_required, npv: o.expected_npv },
        ];
      }),
    );
    exportAllocation(analysis.input, point.allocation, options, {
      scenario: scenario.scenario_name,
      model_version: analysis.model_version,
      input_hash: analysis.input_hash,
      generated_at: analysis.generated_at,
      discount_rate: String(analysis.input.discount_rate),
      random_seed: String(analysis.input.random_seed),
      percentile_convention: "exceedance",
      allocation: selectedPoint
        ? "selected frontier alternative"
        : "recommended",
    });
  };
  return (
    <div className="workbench">
      <a className="skip-link" href="#workspace">
        Skip to workspace
      </a>
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setInput(null);
          }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M3 7 14 2l11 5-11 5L3 7Zm0 7 11 5 11-5M3 21l11 5 11-5"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
          <span>
            Prospect<span className="brand-sub">Engine</span>
          </span>
        </a>
        <div className="sidebar-divider" />
        <nav aria-label="Workspace navigation">
          {views.map((v, i) => (
            <button
              key={v}
              className={view === v && input ? "active" : ""}
              aria-current={view === v && input ? "page" : undefined}
              disabled={!input}
              onClick={() => navigate(v)}
            >
              <span className="nav-symbol" aria-hidden="true">
                {["◫", "▤", "↗", "⇄", "▧", "⌖"][i]}
              </span>
              {friendly(v)}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <p>
            Capital decisions,
            <br />
            with the assumptions in view.
          </p>
          <span>Model 2.0</span>
          {user && (
            <button
              onClick={() =>
                perform(async () => {
                  await api.logout();
                  localStorage.removeItem(
                    `prospect-draft:${user.workspace_id}`,
                  );
                  location.assign("/");
                })
              }
            >
              {user.mode === "local" ? "Clear browser draft" : "Sign out"}
            </button>
          )}
        </div>
      </aside>
      <div className="app-body">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span> {input ? friendly(view) : "Portfolios"}
          </div>
          <div className="topbar-right">
            <span className="connection">
              {user ? user.name : authReady ? "Sample access" : "Connecting…"}
            </span>
            {!user && authReady && (
              <a className="button" href="/api/auth/login">
                Sign in
              </a>
            )}
            <button onClick={startNew}>New portfolio</button>
          </div>
        </header>
        <main id="workspace" tabIndex={-1}>
          {(error || fields.length > 0) && (
            <div className="error-banner" role="alert">
              <strong>{error}</strong>
              {fields.length > 0 && (
                <ul>
                  {fields.map((f) => (
                    <li key={f.field}>
                      {f.field}: {f.message}
                    </li>
                  ))}
                </ul>
              )}
              <button
                onClick={() => {
                  setError("");
                  setFields([]);
                }}
              >
                Dismiss
              </button>
            </div>
          )}
          {notice && (
            <div className="notice" role="status">
              {notice}
              <button
                aria-label="Dismiss notification"
                onClick={() => setNotice("")}
              >
                ×
              </button>
            </div>
          )}
          {!input ? (
            <div className="home">
              <div className="page-heading">
                <div>
                  <p className="eyeline">Exploration & production</p>
                  <h1>
                    Put capital behind
                    <br />
                    the right prospects.
                  </h1>
                  <p>
                    Compare drill, farm-out, divest and defer decisions.
                    <br />
                    Understand the return, the downside and what drives each
                    choice.
                  </p>
                </div>
                <button className="primary" onClick={startNew}>
                  Create a portfolio
                </button>
              </div>
              <section>
                <div className="section-head">
                  <h2>Explore a sample portfolio</h2>
                  <span className="muted">
                    Illustrative data · precomputed results
                  </span>
                </div>
                <div className="sample-grid">
                  <button
                    className="sample-card"
                    disabled={busy}
                    onClick={() => loadDemo("permian")}
                  >
                    <div className="sample-art permian">
                      <span>Delaware / Midland</span>
                      <svg viewBox="0 0 300 100" aria-hidden="true">
                        <path
                          d="m0 90 40-25 35 10 55-55 40 15 40-25 90 45"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                        <path
                          d="m0 95 40-15 35 10 55-40 40 10 40-25 90 45"
                          fill="none"
                          stroke="currentColor"
                          opacity=".4"
                        />
                      </svg>
                    </div>
                    <div className="sample-copy">
                      <h3>Permian Basin</h3>
                      <p>15 prospects · $150M budget</p>
                      <span>
                        Open allocation workspace <b aria-hidden="true">↗</b>
                      </span>
                    </div>
                  </button>
                  <button
                    className="sample-card"
                    disabled={busy}
                    onClick={() => loadDemo("gom")}
                  >
                    <div className="sample-art offshore">
                      <span>Deepwater exploration</span>
                      <svg viewBox="0 0 300 100" aria-hidden="true">
                        <path
                          d="M0 20q40 30 75 0t75 0 75 0 75 0M0 50q40 30 75 0t75 0 75 0 75 0M0 80q40 30 75 0t75 0 75 0 75 0"
                          fill="none"
                          stroke="currentColor"
                        />
                      </svg>
                    </div>
                    <div className="sample-copy">
                      <h3>Gulf of Mexico</h3>
                      <p>8 prospects · $600M budget</p>
                      <span>
                        Open allocation workspace <b aria-hidden="true">↗</b>
                      </span>
                    </div>
                  </button>
                </div>
              </section>
              <section className="panel">
                <h2>Saved portfolios</h2>
                {drafts.length > 0 && (
                  <details>
                    <summary>Recover browser drafts ({drafts.length})</summary>
                    <ul>
                      {drafts.map((d) => (
                        <li key={d.id}>
                          <button
                            className="text-button"
                            onClick={() => perform(() => recoverDraft(d))}
                          >
                            {d.input.name} - {d.input.prospects.length}{" "}
                            prospects
                          </button>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
                {portfolios.length ? (
                  <table>
                    <thead>
                      <tr>
                        <th>Portfolio</th>
                        <th>Prospects</th>
                        <th>Updated</th>
                        <th>Revision</th>
                      </tr>
                    </thead>
                    <tbody>
                      {portfolios.map((p) => (
                        <tr key={p.id}>
                          <td>
                            <button
                              className="text-button"
                              onClick={() => openSaved(p)}
                            >
                              {p.name}
                            </button>
                          </td>
                          <td>{p.input.prospects.length}</td>
                          <td>
                            {new Date(p.updated * 1000).toLocaleDateString()}
                          </td>
                          <td>{p.revision}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="muted">
                    {user
                      ? "Your saved analyses will appear here. Start with a new portfolio or adapt a sample."
                      : "Sign in to save, run and return to your own analyses."}
                  </p>
                )}
              </section>
            </div>
          ) : (
            <>
              <div className="portfolio-heading">
                <div>
                  <label className="portfolio-name">
                    <span className="sr-only">Portfolio name</span>
                    <input
                      value={input.name}
                      title={input.name}
                      maxLength={120}
                      onChange={(e) =>
                        mutate({ ...input, name: e.target.value })
                      }
                    />
                  </label>
                  <p>
                    {input.prospects.length} prospects <span>·</span>{" "}
                    {money(input.capital_budget)} budget <span>·</span>{" "}
                    {sample
                      ? "Sample portfolio · precomputed results"
                      : dirty
                        ? "Unsaved changes"
                        : `Saved revision ${saved?.revision ?? 1}`}
                  </p>
                </div>
                <div className="actions">
                  <button onClick={() => setSettings(true)}>
                    Assumptions & constraints
                  </button>
                  <button
                    disabled={busy || !user}
                    onClick={() => perform(save)}
                  >
                    Save
                  </button>
                  <button
                    className="primary"
                    disabled={busy || active(job) || !user}
                    onClick={run}
                  >
                    {active(job) ? "Analysis running…" : "Run analysis"}
                  </button>
                </div>
              </div>
              {active(job) && (
                <div className="job-banner" role="status">
                  <div>
                    <strong>{job!.message || "Queued for analysis"}</strong>
                    <progress
                      value={job!.progress}
                      max={1}
                      aria-label="Analysis progress"
                    />
                  </div>
                  <button
                    disabled={job?.status === "cancelling"}
                    onClick={() =>
                      perform(async () => setJob(await api.cancel(job!.id)))
                    }
                  >
                    Cancel run
                  </button>
                </div>
              )}
              {stale && (
                <div className="stale-banner" role="status">
                  Inputs have changed. Displayed results belong to the previous
                  run. Run analysis to apply your changes.
                </div>
              )}
              {sample && (
                <div className="sample-banner">
                  Sample portfolio · precomputed results · Model{" "}
                  {analysis?.model_version}. Edit assumptions and run to create
                  your own saved analysis.
                </div>
              )}
              {scenario && (
                <div className="scenario-bar">
                  <label>
                    Result scenario{" "}
                    <select
                      value={scenario.scenario_name}
                      onChange={(e) => {
                        setScenarioName(e.target.value);
                        setSelectedPoint(null);
                      }}
                    >
                      {analysis!.scenario_comparison.scenario_results.map(
                        (s) => (
                          <option key={s.scenario_name}>
                            {s.scenario_name}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                  <span>
                    Run {runId ? runId.slice(0, 8) : "sample"} <span>·</span>{" "}
                    {analysis!.input.simulation_iterations.toLocaleString()}{" "}
                    simulations <span>·</span>{" "}
                    {percent(analysis!.input.discount_rate)} discount rate
                  </span>
                </div>
              )}
              {(view === "allocation" || view === "overview") && (
                <>
                  {point ? (
                    <>
                      <section className="recommendation">
                        <div>
                          <span
                            className="recommendation-icon"
                            aria-hidden="true"
                          >
                            ↗
                          </span>
                          <div>
                            <h1>
                              {selectedPoint
                                ? "Selected allocation"
                                : "Recommended allocation"}
                            </h1>
                            <p>
                              {
                                Object.values(point.allocation).filter(
                                  (d) => d === "drill",
                                ).length
                              }{" "}
                              drill ·{" "}
                              {
                                Object.values(point.allocation).filter(
                                  (d) => d === "farm_out",
                                ).length
                              }{" "}
                              farm-out ·{" "}
                              {
                                Object.values(point.allocation).filter(
                                  (d) => d === "divest",
                                ).length
                              }{" "}
                              divest ·{" "}
                              {
                                Object.values(point.allocation).filter(
                                  (d) => d === "defer",
                                ).length
                              }{" "}
                              defer
                            </p>
                          </div>
                        </div>
                        <span className="verified-label">
                          Constraints verified
                        </span>
                      </section>
                      <Metrics point={point} />
                      {view === "overview" && (
                        <section className="panel">
                          <h2>What drives this allocation</h2>
                          <p>
                            Selected to maximize expected NPV minus{" "}
                            {analysis!.input.risk_aversion} × expected loss
                            under the supplied capital constraints.
                          </p>
                          <dl className="facts">
                            <div>
                              <dt>Expected loss</dt>
                              <dd>{money(point.expected_loss)}</dd>
                            </div>
                            <div>
                              <dt>Average loss in worst 10% of outcomes</dt>
                              <dd>{money(point.cvar90_loss)}</dd>
                            </div>
                            <div>
                              <dt>NPV standard deviation</dt>
                              <dd>{money(point.portfolio_risk)}</dd>
                            </div>
                          </dl>
                          <h3>Binding constraints</h3>
                          {point.binding_constraints.length ? (
                            <ul>
                              {point.binding_constraints.map((c) => (
                                <li key={c}>{c}</li>
                              ))}
                            </ul>
                          ) : (
                            <p>
                              No capital or mandate constraint is binding at
                              this allocation.
                            </p>
                          )}
                          <p className="muted">
                            Results depend on the assumptions. Review sources
                            and alternative terms in each prospect before making
                            a decision.
                          </p>
                        </section>
                      )}
                    </>
                  ) : (
                    <section className="empty-state">
                      <h1>Build your first allocation</h1>
                      <p>
                        Add prospects, review economic assumptions and set price
                        scenarios. Then run the analysis.
                      </p>
                      <button onClick={() => navigate("prospects")}>
                        Review prospects
                      </button>
                    </section>
                  )}
                </>
              )}
              {(view === "allocation" || view === "prospects") && (
                <section className="panel">
                  <div className="section-head">
                    <div>
                      <h2>
                        {view === "prospects"
                          ? "Prospect inputs"
                          : "Capital allocation"}
                      </h2>
                      <p>
                        {view === "prospects"
                          ? "Review assumptions and sources before running."
                          : "Select a prospect to inspect alternatives and uncertainty."}
                      </p>
                    </div>
                    {view === "prospects" && (
                      <div className="actions">
                        <button onClick={csvTemplate}>CSV template</button>
                        <label className="button file-button">
                          Import CSV / JSON
                          <input
                            type="file"
                            accept=".csv,.json"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) importFile(f);
                              e.target.value = "";
                            }}
                          />
                        </label>
                        <button
                          disabled={input.prospects.length >= 40}
                          onClick={() => {
                            const p = newProspect();
                            mutate({
                              ...input,
                              prospects: [...input.prospects, p],
                            });
                            setSelectedId(p.prospect_id);
                            setEditing(true);
                          }}
                        >
                          Add prospect
                        </button>
                      </div>
                    )}
                  </div>
                  {importErrors.length > 0 && (
                    <ul role="alert" className="import-errors">
                      {importErrors.map((e) => (
                        <li key={e}>{e}</li>
                      ))}
                    </ul>
                  )}
                  <div className="table-toolbar">
                    <label className="search-field">
                      <span className="sr-only">Search prospects</span>
                      <input
                        placeholder="Search prospects or basins"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </label>
                    <label>
                      Decision{" "}
                      <select
                        value={decisionFilter}
                        onChange={(e) => setDecisionFilter(e.target.value)}
                      >
                        <option value="all">All decisions</option>
                        {Object.entries(DECISION_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </label>
                    <span className="muted">{rows.length} shown</span>
                  </div>
                  <div className="table-scroll">
                    <table className="allocation-table">
                      <thead>
                        <tr>
                          {(["name", "capital", "npv"] as const).map((k) => (
                            <th
                              key={k}
                              aria-sort={
                                sort === k
                                  ? descending
                                    ? "descending"
                                    : "ascending"
                                  : "none"
                              }
                            >
                              <button
                                onClick={() => {
                                  setSort(k);
                                  setDescending(
                                    sort === k ? !descending : k !== "name",
                                  );
                                }}
                              >
                                {k === "name"
                                  ? "Prospect"
                                  : k === "capital"
                                    ? "Capital required"
                                    : "Expected NPV"}{" "}
                                {sort === k ? (descending ? "↓" : "↑") : ""}
                              </button>
                            </th>
                          ))}
                          <th>Decision</th>
                          <th>P(positive NPV)</th>
                          <th>Constraint / change</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map(({ p, d, option }) => {
                          const fixed =
                            input.constraints.fixed_decisions[p.prospect_id];
                          const mandate =
                            input.constraints.mandatory_drill?.includes(
                              p.prospect_id,
                            )
                              ? "Required drill"
                              : input.constraints.mandatory_defer?.includes(
                                    p.prospect_id,
                                  )
                                ? "Required defer"
                                : fixed
                                  ? `Fixed ${DECISION_LABELS[fixed]}`
                                  : null;
                          const prior =
                            baselineScenario?.optimization_result
                              .recommended_portfolio.allocation[p.prospect_id];
                          return (
                            <tr key={p.prospect_id}>
                              <td>
                                <button
                                  className="prospect-link"
                                  onClick={() => {
                                    setSelectedId(p.prospect_id);
                                    setEditing(view === "prospects");
                                  }}
                                >
                                  {p.name}
                                </button>
                                <small>{friendly(p.basin)}</small>
                              </td>
                              <td>
                                {option ? money(option.capital_required) : "—"}
                              </td>
                              <td
                                className={
                                  option && option.expected_npv < 0
                                    ? "negative"
                                    : ""
                                }
                              >
                                {option ? money(option.expected_npv) : "—"}
                              </td>
                              <td>{d ? <Decision value={d} /> : "Not run"}</td>
                              <td>
                                {option
                                  ? percent(option.probability_positive_npv)
                                  : "—"}
                              </td>
                              <td>
                                {mandate ??
                                  (prior && prior !== d
                                    ? `${DECISION_LABELS[prior]} → ${d ? DECISION_LABELS[d] : ""}`
                                    : "—")}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {rows.length === 0 && (
                      <p className="empty-row">
                        No matching prospects. Clear the filters or add a
                        prospect.
                      </p>
                    )}
                  </div>
                </section>
              )}
              {view === "allocation" && scenario && (
                <Frontier
                  scenario={scenario}
                  selected={selectedPoint}
                  onSelect={setSelectedPoint}
                />
              )}
              {view === "scenarios" && (
                <>
                  <PriceEditor input={input} onChange={mutate} />
                  {analysis && (
                    <ScenarioComparison
                      analysis={analysis}
                      onSelect={(s) => {
                        setScenarioName(s);
                        setSelectedPoint(null);
                        navigate("allocation");
                      }}
                    />
                  )}
                </>
              )}
              {view === "locations" && (
                <>
                  <SpatialView
                    prospects={analysis?.input.prospects ?? input.prospects}
                    point={point}
                    onSelect={(id) => {
                      setSelectedId(id);
                      setEditing(false);
                    }}
                  />
                  {sample && (
                    <section className="panel">
                      <h2>Subsurface illustration</h2>
                      <p className="muted">
                        Synthetic sample geometry, not a geological
                        interpretation or source of the economic estimates.
                      </p>
                      <button onClick={() => setSpatial3d(!spatial3d)}>
                        {spatial3d
                          ? "Close subsurface view"
                          : "Open 3D illustration"}
                      </button>
                      {spatial3d && (
                        <ErrorBoundary
                          fallback={
                            <p role="alert">
                              3D is unavailable. Use the location table.
                            </p>
                          }
                        >
                          <Suspense fallback={<p>Loading 3D illustration…</p>}>
                            <Subsurface
                              sample={sample}
                              analysis={analysis!}
                              scenario={scenarioName}
                            />
                          </Suspense>
                        </ErrorBoundary>
                      )}
                    </section>
                  )}
                </>
              )}
              {view === "reports" && (
                <>
                  <section className="panel">
                    <h1>Analysis report</h1>
                    <div className="actions">
                      <button
                        onClick={() =>
                          download(
                            "portfolio.json",
                            JSON.stringify(input, null, 2),
                          )
                        }
                      >
                        Export inputs
                      </button>
                      <button
                        disabled={!analysis}
                        onClick={() =>
                          download(
                            "analysis.json",
                            JSON.stringify(analysis, null, 2),
                          )
                        }
                      >
                        Export full run
                      </button>
                      <button disabled={!point} onClick={exportCsv}>
                        Export allocation CSV
                      </button>
                      <button
                        disabled={!analysis}
                        onClick={() => window.print()}
                      >
                        Print / PDF
                      </button>
                    </div>
                    {analysis && point && (
                      <>
                        <h2>{analysis.input.name}</h2>
                        <p>
                          {scenario?.scenario_name} ·{" "}
                          {new Date(analysis.generated_at).toLocaleString()}
                        </p>
                        <Metrics point={point} />
                        <dl className="facts">
                          <div>
                            <dt>Model version</dt>
                            <dd>{analysis.model_version}</dd>
                          </div>
                          <div>
                            <dt>Random seed</dt>
                            <dd>{analysis.input.random_seed}</dd>
                          </div>
                          <div>
                            <dt>Discount rate</dt>
                            <dd>{percent(analysis.input.discount_rate)}</dd>
                          </div>
                          <div>
                            <dt>Input fingerprint</dt>
                            <dd className="hash">{analysis.input_hash}</dd>
                          </div>
                        </dl>
                        <h3>
                          {selectedPoint
                            ? "Selected frontier alternative"
                            : "Recommended allocation"}
                        </h3>
                        <div className="table-scroll">
                          <table>
                            <thead>
                              <tr>
                                <th>Prospect</th>
                                <th>Decision</th>
                                <th>Capital</th>
                                <th>Expected NPV</th>
                              </tr>
                            </thead>
                            <tbody>
                              {analysis.input.prospects.map((p) => {
                                const d = point.allocation[p.prospect_id];
                                const o = scenario?.prospect_results.find(
                                  (r) => r.prospect_id === p.prospect_id,
                                )?.decision_comparison.options[d];
                                return (
                                  <tr key={p.prospect_id}>
                                    <td>{p.name}</td>
                                    <td>{DECISION_LABELS[d]}</td>
                                    <td>{money(o?.capital_required ?? 0)}</td>
                                    <td>{money(o?.expected_npv ?? 0)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        <h3>Method and assumptions</h3>
                        <ul className="methodology">
                          {analysis.methodology.map((m) => (
                            <li key={m}>{m}</li>
                          ))}
                        </ul>
                        <h3>Prospect sources</h3>
                        {analysis.input.prospects.map((p) => (
                          <p key={p.prospect_id}>
                            <strong>{p.name}:</strong> {p.assumption_source}
                          </p>
                        ))}
                      </>
                    )}
                  </section>
                  <section className="panel">
                    <h2>Saved runs and comparison</h2>
                    <label className="field">
                      <span>Compare current results with</span>
                      <select
                        value={baselineId}
                        onChange={(e) => {
                          setBaselineId(e.target.value);
                          if (e.target.value)
                            perform(async () =>
                              setBaseline(await api.result(e.target.value)),
                            );
                          else setBaseline(null);
                        }}
                      >
                        <option value="">No comparison</option>
                        {jobs
                          .filter(
                            (j) => j.status === "completed" && j.id !== runId,
                          )
                          .map((j) => (
                            <option key={j.id} value={j.id}>
                              {new Date(j.created * 1000).toLocaleString()} ·{" "}
                              {j.id.slice(0, 8)}
                            </option>
                          ))}
                      </select>
                    </label>
                    {baselineScenario && point && (
                      <p>
                        Expected NPV change:{" "}
                        <strong>
                          {money(
                            point.expected_npv -
                              baselineScenario.optimization_result
                                .recommended_portfolio.expected_npv,
                          )}
                        </strong>
                        . Decision changes are shown in the allocation table.
                      </p>
                    )}
                    <table>
                      <thead>
                        <tr>
                          <th>Created</th>
                          <th>Status</th>
                          <th>Progress</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {jobs.map((j) => (
                          <tr key={j.id}>
                            <td>
                              {new Date(j.created * 1000).toLocaleString()}
                            </td>
                            <td>{friendly(j.status)}</td>
                            <td>{Math.round(j.progress * 100)}%</td>
                            <td>
                              {j.status === "completed" ? (
                                <button
                                  onClick={() =>
                                    perform(async () =>
                                      openResult(await api.result(j.id), j.id),
                                    )
                                  }
                                >
                                  Open run
                                </button>
                              ) : j.status === "failed" ||
                                j.status === "cancelled" ? (
                                <span>Review inputs, then Run analysis</span>
                              ) : (
                                j.message
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!jobs.length && (
                      <p className="muted">
                        Save and run this portfolio to build an analysis
                        history.
                      </p>
                    )}
                  </section>
                </>
              )}
            </>
          )}
        </main>
        <footer className="workspace-footer">
          <span>Prospect Engine</span>
          <span>
            USD · Annual cash flows · Human-reviewed capital decisions
          </span>
        </footer>
      </div>
      {settings && input && (
        <Drawer
          title="Assumptions & constraints"
          onClose={() => setSettings(false)}
        >
          {fields.length > 0 && (
            <ul role="alert" className="import-errors">
              {fields.map((f) => (
                <li key={f.field}>
                  {f.field.replace(/^input\./, "")}: {f.message}
                </li>
              ))}
            </ul>
          )}
          <PortfolioSettings input={input} onChange={mutate} />
          <button disabled={busy || !user} onClick={() => perform(save)}>
            Validate & save
          </button>
        </Drawer>
      )}
      {selected && input && (
        <Drawer title={selected.name} onClose={() => setSelectedId(null)}>
          {editing && fields.length > 0 && (
            <ul role="alert" className="import-errors">
              {fields
                .filter((f) => f.field.includes("prospects"))
                .map((f) => (
                  <li key={f.field}>
                    {f.field.replace(/^input\.prospects\.\d+\./, "")}:{" "}
                    {f.message}
                  </li>
                ))}
            </ul>
          )}
          <div className="detail-tabs">
            <button
              aria-pressed={!editing}
              disabled={!selectedEvidence}
              onClick={() => setEditing(false)}
            >
              Decision evidence
            </button>
            <button
              aria-pressed={editing}
              disabled={!selectedDraft}
              onClick={() => setEditing(true)}
            >
              Edit assumptions
            </button>
          </div>
          {!editing && selectedEvidence ? (
            <>
              <ProspectEvidence
                prospect={
                  analysis!.input.prospects.find(
                    (p) => p.prospect_id === selectedId,
                  ) ?? selected
                }
                result={selectedEvidence}
              />
              <label className="field">
                <span>Fix this decision for the next run</span>
                <select
                  value={
                    input.constraints.fixed_decisions[selected.prospect_id] ??
                    ""
                  }
                  onChange={(e) => {
                    const fixed = { ...input.constraints.fixed_decisions };
                    if (e.target.value)
                      fixed[selected.prospect_id] = e.target
                        .value as DecisionType;
                    else delete fixed[selected.prospect_id];
                    mutate({
                      ...input,
                      constraints: {
                        ...input.constraints,
                        fixed_decisions: fixed,
                      },
                    });
                  }}
                >
                  <option value="">Let the optimizer choose</option>
                  {Object.entries(DECISION_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <small>
                  Changes require recalculation. Existing mandates still apply.
                </small>
              </label>
            </>
          ) : (
            <>
              <ProspectEditor
                prospect={selected}
                onChange={editProspect}
                decision={input.decisions?.[selected.prospect_id] ?? null}
                onDecision={(d) =>
                  mutate({
                    ...input,
                    decisions: {
                      ...input.decisions,
                      [selected.prospect_id]: d,
                    },
                  })
                }
              />
              <button
                className="danger-button"
                disabled={input.prospects.length <= 1}
                onClick={() => {
                  const id = selected.prospect_id;
                  const fixed = { ...input.constraints.fixed_decisions };
                  delete fixed[id];
                  const decisions = { ...input.decisions };
                  delete decisions[id];
                  mutate({
                    ...input,
                    prospects: input.prospects.filter(
                      (p) => p.prospect_id !== id,
                    ),
                    decisions,
                    constraints: {
                      ...input.constraints,
                      fixed_decisions: fixed,
                      mandatory_drill:
                        input.constraints.mandatory_drill?.filter(
                          (p) => p !== id,
                        ) ?? [],
                      mandatory_defer:
                        input.constraints.mandatory_defer?.filter(
                          (p) => p !== id,
                        ) ?? [],
                    },
                  });
                  setSelectedId(null);
                }}
              >
                Remove prospect from draft
              </button>
            </>
          )}
        </Drawer>
      )}
    </div>
  );
}
