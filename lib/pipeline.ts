// Research pipeline v2 — SERVER ONLY. Corrected brief: investor matching.
//
//   1. TinySet   — build the comparable-companies dataset (POST /v1/datasets
//                  with a spec we define; read rows back as they land).
//   2. Search    — TinyFish Search: funding announcements for similar
//                  companies + investor research (cheque size, partners).
//   3. Fetch     — TinyFish Fetch: read the strongest articles and investor
//                  pages in full.
//   4. Agent     — TinyFish Agent: verify the #1 investor's partner/contact
//                  route on their own website (best-effort, metered).
//   5. Rank      — aggregate investors behind the comps and score them for
//                  THIS founder's stage, sector and geography.
//
// TinySet runs typically take 5-20 minutes; rows stream in. Radar polls for
// up to ~4 minutes — while Search runs concurrently, so the dataset window
// costs no extra wall-clock — and uses whatever rows have landed, topping
// up with Search/Fetch comps so the founder is never left waiting. The
// result records the TinySet dataset id either way — no fake integration.

import type { ComparableCompany, FounderInput, MatchResult, PipelineStep } from "./types";
import { windowStart } from "./types";
import {
  hasTinyFishKey, tfSearch, tfFetch, tfAgentVerify, hostOf,
  tinysetCreate, tinysetGet, tinysetRows, type TinySetSpec,
} from "./tinyfish";
import { compFromTinySetRow, extractComps, keywordsOf, rankInvestors } from "./extract";
import { getPreset, type Preset } from "./presets";
import { DAILY_LIVE_CAP, simulateQuota } from "./quota";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * TinySet rows requested per live run. The brief's minimum is 10 comparable
 * companies, and rows are the wallet's known cost driver ($0.10/row), so
 * Radar requests 10 (≈ $1.00 of dataset cost per run) and lets the
 * Search/Fetch top-up path push the verified set past 10 when it can.
 */
export const TINYSET_TARGET_ROWS = 10;

/**
 * TinySet polling (pass 6): the first live run created the dataset and was
 * charged for it, but 0 rows landed inside the old 75-second polling window —
 * real TinySet builds take minutes. Radar now polls for up to ~240s,
 * checking every ~10s and stopping as soon as the target rows land, while
 * the Search phase runs concurrently. Absolute deadlines keep the whole run
 * inside the route's maxDuration (300s): polling stops by ~225s into the
 * run, and Fetch/Agent receive whatever budget remains under a ~285s soft
 * cap, so every existing fallback still fires in time.
 */
export const TINYSET_POLL_WINDOW_MS = 240_000;
export const TINYSET_POLL_INTERVAL_MS = 10_000;
const RUN_POLL_DEADLINE_MS = 225_000;
const RUN_SOFT_BUDGET_MS = 285_000;

/**
 * Poll a TinySet dataset until rows land, the run reports ready/failed, or
 * the deadline passes. Transient poll errors are ignored (the next tick
 * retries); the most complete row set read is returned.
 */
async function pollTinysetRows(
  datasetId: string,
  deadline: number
): Promise<{ rows: Record<string, unknown>[]; status: string }> {
  let rows: Record<string, unknown>[] = [];
  let status = "";
  while (Date.now() < deadline) {
    await sleep(TINYSET_POLL_INTERVAL_MS);
    if (Date.now() >= deadline) break;
    try {
      const st = await tinysetGet(datasetId);
      status = st.status;
      if (st.rowCount > 0) {
        const fetched = await tinysetRows(datasetId, 100);
        if (fetched.length >= rows.length) rows = fetched;
        if (rows.length >= TINYSET_TARGET_ROWS || status === "ready") break;
      }
      if (status === "ready" || status === "failed") break;
    } catch {
      // Transient error reading the dataset — keep polling until the deadline.
    }
  }
  return { rows, status };
}

/** True when an error is TinyFish saying the wallet cannot pay (HTTP 402 / INSUFFICIENT_CREDITS / quota). */
export function isCreditsError(e: unknown): boolean {
  const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
  return msg.includes("402") || msg.includes("insufficient") || msg.includes("quota");
}

/** Keyword-match a founder description to the closest demo preset, if any. */
export function closestPresetFor(input: FounderInput): Preset | null {
  const text = `${input.description} ${input.sector ?? ""}`.toLowerCase();
  if (/skin|beauty|d2c|cosmetic|brand/.test(text)) return getPreset("india-d2c-skincare");
  if (/code|developer|devtool|pull request|software engineer/.test(text)) return getPreset("us-ai-devtool");
  if (/fintech|payment|upi|bank|finance|smb|small business/.test(text)) return getPreset("indian-fintech");
  return null;
}

/**
 * Graceful quota fallback — the wallet-protection promise: a visitor NEVER
 * sees an error page because live search is resting. Returns the closest
 * worked example (a demo preset), flagged notice: "live-quota", with the
 * honest steps that ran before the switch preserved in front of the log.
 */
export function quotaFallbackResult(
  input: FounderInput,
  priorSteps: PipelineStep[],
  reason: "daily-cap" | "credits",
  reasonDetail?: string
): MatchResult {
  const preset =
    closestPresetFor(input) ??
    getPreset(input.country === "India" ? "indian-fintech" : "us-ai-devtool")!;
  const r = structuredClone(preset.result);
  r.input = input;
  r.notice = "live-quota";

  const switchStep: PipelineStep =
    reason === "daily-cap"
      ? {
          id: "quota-fallback",
          label: "Live search paused — today's live-search budget is used up",
          detail: `Radar caps live searches at ${DAILY_LIVE_CAP} per day to protect the TinyFish wallet (each live run builds a ${TINYSET_TARGET_ROWS}-row TinySet dataset ≈ $1.00, plus Search/Fetch calls). No credits were spent on this request.`,
          status: "skipped",
          ms: 0,
        }
      : {
          id: "quota-fallback",
          label: "Live search paused — TinyFish credits ran out mid-run",
          detail: `TinyFish reported insufficient credits${reasonDetail ? ` (${reasonDetail})` : ""}. Radar stopped spending immediately — nothing further was charged for this request — and switched to a worked example.`,
          status: "skipped",
          ms: 0,
        };
  const exampleStep: PipelineStep = {
    id: "quota-example",
    label: `Worked example shown — “${preset.label}”`,
    detail: "This is one of Radar's three fully worked sample results, chosen as the closest match to your description and labelled as a sample everywhere it appears. Everything else on the site — exports, saved investors, methodology — works as normal.",
    status: "done",
    ms: 0,
  };
  r.steps = [...priorSteps, switchStep, exampleStep, ...r.steps];
  r.caveats = [
    reason === "daily-cap"
      ? "Live search is resting: today's live-search budget is used up so the wallet stays safe. The result below is a worked example, not a live run for your exact description — live searches reset at midnight UTC."
      : "Live search stopped part-way: the TinyFish wallet ran out of credits during this run. The result below is a worked example, not a live run for your exact description.",
    ...r.caveats,
  ];
  return r;
}

function tinysetSpecFor(input: FounderInput): TinySetSpec {
  const win = windowStart();
  return {
    name: `Funding Radar comparables — ${input.sector || input.description.slice(0, 40)}`,
    description:
      `One row per startup similar to this one: "${input.description}" (stage: ${input.stage}, country: ${input.country}). ` +
      `Only include companies that announced a funding round between ${win.label} and today. Every row must carry the source article URL the funding was reported in.`,
    columns: [
      { name: "company", type: "string", is_primary_key: true, retrieval_hint: "The startup's brand name, from the funding announcement headline." },
      { name: "what_it_does", type: "string", is_primary_key: false, retrieval_hint: "One line on what the company sells and to whom, from its site or the article." },
      { name: "country", type: "string", is_primary_key: false },
      { name: "round", type: "string", is_primary_key: false, retrieval_hint: "Round name as reported, e.g. Seed, Series A, Series B." },
      { name: "amount_usd", type: "number", is_primary_key: false, retrieval_hint: "Amount raised in USD as a plain number; leave empty if undisclosed." },
      { name: "date", type: "date", is_primary_key: false, retrieval_hint: "Month and year the round was announced." },
      { name: "investors", type: "string", is_primary_key: false, retrieval_hint: "Comma-separated investor names named in the announcement, lead investor first." },
      { name: "source_url", type: "url", is_primary_key: false, retrieval_hint: "URL of the article or announcement the row's facts came from. Required." },
    ],
  };
}

export function searchQueriesFor(input: FounderInput): string[] {
  const kws = keywordsOf(input.description).slice(0, 5).join(" ");
  const yr = new Date().getFullYear();
  return [
    `${input.sector || kws} startup raises funding ${yr} ${input.country}`,
    `${kws} startup seed funding investors ${yr}`,
    `startups like ${kws} raised Series A funding ${input.country} ${yr}`,
    `${input.sector || kws} companies funded last 12 months investors list`,
  ];
}

export async function runMatch(input: FounderInput): Promise<MatchResult> {
  const steps: PipelineStep[] = [];
  const step = (s: PipelineStep) => steps.push(s);
  const win = windowStart();

  if (!hasTinyFishKey()) {
    step({ id: "demo", label: "Demo mode — no TinyFish API key configured", detail: "Demo presets return full sample results. Set TINYFISH_API_KEY on the server to run TinySet + Search + Fetch + Agent live for any description.", status: "done", ms: 0 });
    return {
      input, mode: "demo", generatedAt: new Date().toISOString(),
      comps: [], investors: [], sources: [], steps,
      caveats: ["Demo mode: pick one of the three preset startups to see a full sample result, or add a TinyFish API key for live research."],
      tinyset: { attempted: false, datasetId: null, rowsUsed: 0, note: "TinySet runs in live mode only — it builds the comparable-companies dataset through the Datasets API." },
      status: "no_matches",
    };
  }

  // Test hook only (lib/quota.ts): simulate a wallet that cannot pay, to
  // verify the graceful fallback without spending real credits.
  if (simulateQuota() === "credits") {
    step({ id: "tinyset-create", label: "TinySet — dataset build", detail: "Simulated failure (test hook FUNDING_RADAR_SIMULATE_QUOTA=credits): TinySet INSUFFICIENT_CREDITS — the wallet cannot cover the dataset rows.", status: "failed", ms: 0, endpoint: "TinySet" });
    return quotaFallbackResult(input, steps, "credits", "simulated 402 INSUFFICIENT_CREDITS");
  }

  const runStart = Date.now();

  // ---- 1. TinySet: build the comparable-companies dataset ----
  let tinysetComps: ComparableCompany[] = [];
  let datasetId: string | null = null;
  let tinysetNote = "";
  const tTs = Date.now();
  try {
    const ds = await tinysetCreate(tinysetSpecFor(input), TINYSET_TARGET_ROWS);
    datasetId = ds.id || null;
    if (!datasetId) throw new Error("TinySet returned no dataset id");
    step({ id: "tinyset-create", label: "TinySet — dataset created, agents building it", detail: `Dataset ${datasetId} created with Radar's 8-column spec (company, what it does, country, round, amount, date, investors, source URL). Target: ${TINYSET_TARGET_ROWS} companies that raised since ${win.label}.`, status: "done", ms: Date.now() - tTs, endpoint: "TinySet" });
  } catch (e) {
    if (isCreditsError(e)) {
      // Wallet cannot pay for the dataset — stop spending NOW (Search/Fetch
      // would only fail the same way) and serve the graceful fallback with
      // the honest steps that ran so far.
      step({ id: "tinyset-create", label: "TinySet — dataset build", detail: `TinySet could not start: ${e instanceof Error ? e.message : "credits error"}. Remaining live steps skipped to protect the wallet.`, status: "failed", ms: Date.now() - tTs, endpoint: "TinySet" });
      return quotaFallbackResult(input, steps, "credits", e instanceof Error ? e.message : undefined);
    }
    tinysetNote = `TinySet dataset creation failed (${e instanceof Error ? e.message : "unknown error"}). Radar continued with Search + Fetch + Agent, which build the same dataset shape from live sources.`;
    step({ id: "tinyset-create", label: "TinySet — dataset build", detail: tinysetNote, status: "failed", ms: Date.now() - tTs, endpoint: "TinySet" });
  }

  // Poll for TinySet rows CONCURRENTLY with the Search phase below (pass 6):
  // the promise starts now and is awaited after Search, so the up-to-~4-minute
  // dataset window costs no extra wall-clock. It never rejects — poll errors
  // are absorbed inside pollTinysetRows — so abandoning it on a mid-Search
  // credits fallback is safe.
  const pollPromise: Promise<{ rows: Record<string, unknown>[]; status: string }> | null =
    datasetId
      ? pollTinysetRows(
          datasetId,
          Math.min(Date.now() + TINYSET_POLL_WINDOW_MS, runStart + RUN_POLL_DEADLINE_MS)
        )
      : null;

  // ---- 2. Search: funding announcements + investor research ----
  // Steps are collected separately and appended after the TinySet rows step,
  // keeping the log in pipeline order even though Search ran concurrently.
  const searchSteps: PipelineStep[] = [];
  const sstep = (s: PipelineStep) => searchSteps.push(s);
  const queries = searchQueriesFor(input);
  sstep({ id: "plan", label: "Planned research queries", detail: queries.join("  ·  "), status: "done", ms: 2, endpoint: "Search" });
  const allResults = [];
  const seen = new Set<string>();
  for (let i = 0; i < queries.length; i++) {
    const t0 = Date.now();
    try {
      const rows = await tfSearch(queries[i]);
      let added = 0;
      for (const r of rows) if (!seen.has(r.url)) { seen.add(r.url); allResults.push(r); added++; }
      sstep({ id: `search-${i + 1}`, label: `TinyFish Search — "${queries[i]}"`, detail: `${rows.length} results, ${added} new`, status: "done", ms: Date.now() - t0, endpoint: "Search" });
    } catch (e) {
      sstep({ id: `search-${i + 1}`, label: `TinyFish Search — "${queries[i]}"`, detail: `Failed: ${e instanceof Error ? e.message : "unknown error"}`, status: "failed", ms: Date.now() - t0, endpoint: "Search" });
      if (isCreditsError(e)) {
        // Credits ran out mid-pipeline: steps above already spent what they
        // spent; stop here and serve the complete-looking fallback. The
        // background poll is abandoned (it cannot reject).
        return quotaFallbackResult(input, [...steps, ...searchSteps], "credits", e instanceof Error ? e.message : undefined);
      }
    }
  }

  // ---- 1b. TinySet rows: collect whatever the concurrent poll landed ----
  if (pollPromise && datasetId) {
    const { rows } = await pollPromise;
    const mapped = rows.map(compFromTinySetRow).filter((c): c is ComparableCompany => c !== null);
    tinysetComps = mapped;
    tinysetNote = mapped.length > 0
      ? `TinySet dataset ${datasetId} contributed ${mapped.length} comparable companies with source URLs. The dataset keeps building in the background (TinySet runs typically take 5-20 minutes) — re-run later for a fuller set.`
      : `TinySet dataset ${datasetId} was created but no rows had landed inside Radar's polling window (up to ~4 minutes; typical builds take 5-20 minutes). Radar topped up with Search + Fetch below; the dataset id is recorded so the run is verifiable in the TinyFish dashboard.`;
    step({ id: "tinyset-rows", label: "TinySet — rows read back", detail: tinysetNote, status: mapped.length > 0 ? "done" : "skipped", ms: Date.now() - tTs, endpoint: "TinySet" });
  }
  steps.push(...searchSteps);

  // ---- 3. Fetch: read strongest sources in full ----
  const fetchTargets = allResults.slice(0, 6).map((r) => r.url);
  const tF = Date.now();
  let fetchedPages: Awaited<ReturnType<typeof tfFetch>> = [];
  // Budget-aware timeout (pass 6): leave room for ranking + the Agent pass
  // under the run's soft cap so the route always answers within maxDuration.
  const fetchTimeoutMs = Math.max(10_000, Math.min(60_000, runStart + RUN_SOFT_BUDGET_MS - Date.now() - 30_000));
  try {
    fetchedPages = await tfFetch(fetchTargets, fetchTimeoutMs);
    step({ id: "fetch", label: "TinyFish Fetch — articles read in full", detail: `Fetched ${fetchedPages.length} of ${fetchTargets.length} pages (${fetchTargets.map(hostOf).join(", ")})`, status: fetchedPages.length ? "done" : "failed", ms: Date.now() - tF, endpoint: "Fetch" });
  } catch (e) {
    step({ id: "fetch", label: "TinyFish Fetch — articles read in full", detail: `Fetch failed (${e instanceof Error ? e.message : "unknown error"}); continuing with snippets.`, status: "failed", ms: Date.now() - tF, endpoint: "Fetch" });
    if (isCreditsError(e)) {
      // Credits ran out at the Fetch stage — earlier steps already spent
      // what they spent; serve the complete-looking fallback from here.
      return quotaFallbackResult(input, steps, "credits", e instanceof Error ? e.message : undefined);
    }
  }

  // ---- Merge comps: TinySet rows first (they carry dataset provenance), then Search/Fetch extraction ----
  const searchComps = extractComps(allResults, fetchedPages, input);
  const byName = new Map<string, ComparableCompany>();
  for (const c of searchComps) byName.set(c.name.toLowerCase(), c);
  for (const c of tinysetComps) {
    const key = c.name.toLowerCase();
    const existing = byName.get(key);
    if (!existing) byName.set(key, c);
    else {
      for (const inv of c.investors) if (!existing.investors.includes(inv)) existing.investors.push(inv);
      if (existing.amountUSD === null && c.amountUSD !== null) { existing.amountUSD = c.amountUSD; existing.amountLabel = c.amountLabel; }
    }
  }
  const comps = [...byName.values()].slice(0, 15);

  // ---- 4. Rank investors ----
  const tR = Date.now();
  const investors = rankInvestors(comps, input);
  step({ id: "rank", label: "Ranking — scored for your startup", detail: `Aggregated ${investors.length} investors from ${comps.length} comparable companies and scored each on stage fit, sector overlap, geography (${input.country}) and recency.`, status: "done", ms: Date.now() - tR, endpoint: "Rank" });

  // ---- 5. Agent: verify #1 investor's site for partner + contact route ----
  if (investors.length > 0) {
    const top = investors[0];
    const siteGuess = allResults.find((r) => r.title.toLowerCase().includes(top.name.toLowerCase().split(" ")[0]));
    const tA = Date.now();
    if (siteGuess) {
      const agentTimeoutMs = Math.max(8_000, Math.min(50_000, runStart + RUN_SOFT_BUDGET_MS - Date.now() - 5_000));
      const out = await tfAgentVerify(siteGuess.url, top.name, agentTimeoutMs);
      if (out) {
        top.partnerNote = `Agent-verified on the investor's own pages: ${out.slice(0, 280)}`;
        top.contactUrl = siteGuess.url;
        top.contactLabel = "Investor website (Agent-verified)";
        step({ id: "agent", label: "TinyFish Agent — #1 investor verification", detail: `Agent opened pages for ${top.name} to verify partner and contact details; findings merged into the #1 card.`, status: "done", ms: Date.now() - tA, endpoint: "Agent" });
      } else {
        step({ id: "agent", label: "TinyFish Agent — #1 investor verification", detail: "Agent pass skipped or timed out; partner/contact fields use the honest fallback text.", status: "skipped", ms: Date.now() - tA, endpoint: "Agent" });
      }
    } else {
      step({ id: "agent", label: "TinyFish Agent — #1 investor verification", detail: "No investor website surfaced in search results to verify against; skipped.", status: "skipped", ms: Date.now() - tA, endpoint: "Agent" });
    }
  }

  const sources = comps.map((c) => ({ title: c.sourceTitle, url: c.sourceUrl, publisher: c.publisher, fetched: c.fetched }));
  const caveats: string[] = [];
  if (comps.length < 10) caveats.push(`Only ${comps.length} comparable companies with proof links could be verified in this run (target: 10+). The TinySet dataset keeps building in the background — re-running later usually fills the set.`);
  if (comps.some((c) => c.amountUSD === null)) caveats.push("Some comparables did not disclose their round amount; they still count for investor matching, but not for cheque-size estimates.");
  caveats.push("Cheque sizes are estimates derived from rounds in this dataset unless a firm's own published range was found — always verify on the investor's website.");
  caveats.push("Partner names are only shown when a fetched page supports them; otherwise the card tells you how to find the right partner.");

  return {
    input, mode: "live", generatedAt: new Date().toISOString(),
    comps, investors, sources, steps, caveats,
    tinyset: { attempted: true, datasetId, rowsUsed: tinysetComps.length, note: tinysetNote },
    status: comps.length >= 10 ? "ok" : comps.length >= 4 ? "few_matches" : "no_matches",
  };
}

export function demoResultFor(input: FounderInput): MatchResult {
  // In demo mode, an exact-ish match to a preset's sector returns that preset
  // so the judge can still see a full result; otherwise an honest demo state.
  const preset = closestPresetFor(input);
  if (preset) {
    const r = structuredClone(preset.result);
    r.input = input;
    r.steps = [
      { id: "demo-match", label: "Demo mode — closest preset shown", detail: `Your description is closest to the “${preset.label}” preset, so its full sample result is shown. Add a TinyFish API key for live research on your exact description.`, status: "done", ms: 0 },
      ...r.steps,
    ];
    return r;
  }
  return {
    input, mode: "demo", generatedAt: new Date().toISOString(),
    comps: [], investors: [], sources: [],
    steps: [{ id: "demo", label: "Demo mode — no TinyFish API key configured", detail: "Custom descriptions need live mode. The three presets on the home page show full sample results.", status: "done", ms: 0 }],
    caveats: ["Demo mode: add TINYFISH_API_KEY on the server to research this exact description live."],
    tinyset: { attempted: false, datasetId: null, rowsUsed: 0, note: "TinySet runs in live mode only." },
    status: "no_matches",
  };
}
