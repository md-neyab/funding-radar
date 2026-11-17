// TinyFish API client — SERVER ONLY.
// The API key is read from the TINYFISH_API_KEY environment variable and is
// only ever sent as the `X-API-Key` header to TinyFish endpoints from
// server-side route handlers. It never reaches the browser.
//
// Endpoints (verified against https://docs.tinyfish.ai/for-coding-agents):
//   Search: GET  https://api.search.tinyfish.ai?query=...&language=en
//           -> { query, total_results, results: [{ position, site_name, title, snippet, url }] }
//   Fetch:  POST https://api.fetch.tinyfish.ai   body { urls: [...], format: "markdown" }
//           -> { results: [{ url, text/content/markdown, ... }] } (shape parsed defensively)
//   Agent:  POST https://agent.tinyfish.ai/v1/automation/run  body { url, goal }
//           -> { result_json / result, status } (metered; used as an optional verification pass)

const SEARCH_URL = "https://api.search.tinyfish.ai";
const FETCH_URL = "https://api.fetch.tinyfish.ai";
const AGENT_URL = "https://agent.tinyfish.ai/v1/automation/run";

export function hasTinyFishKey(): boolean {
  return Boolean(process.env.TINYFISH_API_KEY && process.env.TINYFISH_API_KEY.trim().length > 0);
}

function key(): string {
  return process.env.TINYFISH_API_KEY!.trim();
}

export interface TFSearchResult {
  position: number;
  siteName: string;
  title: string;
  snippet: string;
  url: string;
}

export async function tfSearch(query: string, timeoutMs = 12000): Promise<TFSearchResult[]> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const u = new URL(SEARCH_URL);
    u.searchParams.set("query", query);
    u.searchParams.set("language", "en");
    const res = await fetch(u.toString(), {
      headers: { "X-API-Key": key(), Accept: "application/json" },
      signal: ctrl.signal,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`TinyFish Search HTTP ${res.status}`);
    const data: any = await res.json();
    const rows: any[] = Array.isArray(data?.results) ? data.results : [];
    return rows
      .filter((r) => r && r.url)
      .map((r, i) => ({
        position: typeof r.position === "number" ? r.position : i + 1,
        siteName: String(r.site_name ?? r.siteName ?? hostOf(r.url)),
        title: String(r.title ?? "").trim(),
        snippet: String(r.snippet ?? r.description ?? "").trim(),
        url: String(r.url),
      }));
  } finally {
    clearTimeout(t);
  }
}

export interface TFFetchedPage {
  url: string;
  text: string;
}

export async function tfFetch(urls: string[], timeoutMs = 60000): Promise<TFFetchedPage[]> {
  if (urls.length === 0) return [];
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(FETCH_URL, {
      method: "POST",
      headers: {
        "X-API-Key": key(),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ urls: urls.slice(0, 10), format: "markdown" }),
      signal: ctrl.signal,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`TinyFish Fetch HTTP ${res.status}`);
    const data: any = await res.json();
    const rows: any[] = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
    return rows
      .map((r) => {
        const url = String(r?.url ?? r?.final_url ?? "");
        const text = String(r?.text ?? r?.content ?? r?.markdown ?? r?.html ?? "").trim();
        return { url, text };
      })
      .filter((r) => r.url && r.text.length > 0);
  } finally {
    clearTimeout(t);
  }
}

/**
 * Optional verification pass: asks the TinyFish Agent to open a company
 * profile page and return structured funding facts as JSON. Metered, so it
 * is best-effort — any failure returns null and the pipeline continues with
 * Search + Fetch evidence alone.
 */
export async function tfAgentVerify(profileUrl: string, company: string, timeoutMs = 50000): Promise<string | null> {
  if (process.env.TINYFISH_ENABLE_AGENT === "false") return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(AGENT_URL, {
      method: "POST",
      headers: {
        "X-API-Key": key(),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        url: profileUrl,
        goal: `Extract the funding history of ${company} from this page. Return JSON only: an array of rounds, each with round name (e.g. "Series A"), amount in USD if shown, date if shown, and investor names if shown. If the page has no funding data, return an empty array.`,
      }),
      signal: ctrl.signal,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    const out = data?.result_json ?? data?.result ?? data?.output ?? null;
    if (!out) return null;
    return typeof out === "string" ? out : JSON.stringify(out);
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

// ---------------------------------------------------------------------------
// TinySet (Datasets API) — https://docs.tinyfish.ai/datasets/reference
// Base: https://agent.tinyfish.ai, same X-API-Key header.
//   POST /v1/datasets            { prompt | spec, target_rows, populate } -> dataset (202 when a run starts)
//   GET  /v1/datasets/{id}       -> { id, status, row_count, run: { id, status, error? } }
//   GET  /v1/datasets/{id}/rows  -> { data: [ { <column>: value, ... } ], truncated, next_cursor }
// Dataset status: empty | populating | ready | failed | cancelled.
// Run status: queued | running | done | failed | cancelled. Per the docs
// guide, "a failed run explains why in run.error" — so the client surfaces
// run.error verbatim (truncated) instead of discarding it.
// A populate run typically takes 5-20 minutes and costs $0.10 per row from
// the wallet. Rows stream in, so partial rows can be read while it runs.
// ---------------------------------------------------------------------------

const DATASETS_URL = "https://agent.tinyfish.ai/v1/datasets";

export interface TinySetSpec {
  name: string;
  description: string;
  columns: {
    name: string;
    label?: string;
    type: "string" | "number" | "boolean" | "url" | "date";
    is_primary_key: boolean;
    retrieval_hint?: string;
  }[];
}

export interface TinySetDataset {
  id: string;
  status: string;
  rowCount: number;
  runStatus: string | null;
  runId: string | null;
  /** The run's own error text when it failed (docs: run.error). Truncated. */
  runError: string | null;
}

function parseDataset(data: any, fallbackId = ""): TinySetDataset {
  const d = data?.dataset ?? data ?? {};
  const run = d?.run ?? null;
  let runError: string | null = null;
  if (run?.error != null) {
    runError = typeof run.error === "string" ? run.error : JSON.stringify(run.error);
    if (runError && runError.length > 300) runError = runError.slice(0, 300) + "…";
  }
  return {
    id: String(d?.id ?? fallbackId),
    status: String(d?.status ?? ""),
    rowCount: Number(d?.row_count ?? 0),
    runStatus: run?.status ? String(run.status) : null,
    runId: run?.id ? String(run.id) : null,
    runError,
  };
}

async function tfJson(url: string, init: RequestInit, timeoutMs: number): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      headers: { "X-API-Key": key(), "Content-Type": "application/json", Accept: "application/json", ...(init.headers ?? {}) },
      signal: ctrl.signal,
      cache: "no-store",
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const code = data?.error?.code ?? `HTTP ${res.status}`;
      throw new Error(`TinySet ${code}`);
    }
    return data;
  } finally {
    clearTimeout(t);
  }
}

export async function tinysetCreate(spec: TinySetSpec, targetRows: number): Promise<TinySetDataset> {
  const data = await tfJson(
    DATASETS_URL,
    { method: "POST", body: JSON.stringify({ spec, target_rows: targetRows, populate: true }) },
    30000
  );
  const ds = parseDataset(data);
  if (!ds.status) ds.status = "populating";
  return ds;
}

export async function tinysetGet(id: string): Promise<TinySetDataset> {
  const data = await tfJson(`${DATASETS_URL}/${id}`, { method: "GET" }, 15000);
  return parseDataset(data, id);
}

export async function tinysetRows(id: string, limit = 100): Promise<Record<string, unknown>[]> {
  const data = await tfJson(`${DATASETS_URL}/${id}/rows?limit=${limit}`, { method: "GET" }, 20000);
  const rows: any[] = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
  return rows.map((r) => {
    // Rows are documented as flat cell objects keyed by column name, but the
    // run event stream describes a row as { row_id, data: { ...cells } }.
    // Unwrap the wrapped shape if it ever shows up here so cell lookups by
    // column name work either way.
    if (r && typeof r === "object") {
      const cells = (r as Record<string, unknown>).data;
      if (cells && typeof cells === "object" && !Array.isArray(cells)) {
        return cells as Record<string, unknown>;
      }
    }
    return r as Record<string, unknown>;
  });
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
