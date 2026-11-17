// Wallet protection — SERVER ONLY.
//
// Funding Radar runs on a small prepaid TinyFish wallet ($8). Once the API
// key is live on a public site, anyone — visitors, judges, bots — could
// trigger live searches and drain it. This module is the guard layer:
//
//   1. DAILY CAP — at most DAILY_LIVE_CAP live (non-preset, non-cached)
//      searches per UTC day. A live run's known cost driver is its TinySet
//      dataset: 10 rows × $0.10 ≈ $1.00, plus Search/Fetch calls — so the
//      cap bounds worst-case daily dataset spend to roughly the wallet.
//   2. RESULT CACHE — a repeat of the same normalized search is re-served
//      from memory for free and does NOT count against the cap.
//   3. GRACEFUL FALLBACK — when the cap is hit or TinyFish reports a
//      credits error, the route/pipeline returns a worked example with
//      notice "live-quota" instead of an error (see pipeline.ts).
//
// State is module-level in-memory. On serverless hosting that makes both
// the counter and the cache PER-INSTANCE and best-effort (a cold start
// resets them; parallel instances each keep their own count). That is an
// accepted trade-off: combined with the cache and the credits-error
// fallback, the wallet can still never produce a broken-looking site —
// the worst case is a few extra live runs across instances, and the
// moment TinyFish itself says "insufficient credits" the fallback takes
// over regardless of what any counter believed.

import type { FounderInput, MatchResult } from "./types";

export const DAILY_LIVE_CAP = 8;

// ---------------------------------------------------------------------------
// Daily live-search counter (keyed by UTC date)
// ---------------------------------------------------------------------------

interface DayUsage {
  date: string; // UTC yyyy-mm-dd
  count: number;
}

let usage: DayUsage = { date: utcToday(), count: 0 };

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function rollDay(): void {
  const today = utcToday();
  if (usage.date !== today) usage = { date: today, count: 0 };
}

export function liveSearchesUsedToday(): number {
  rollDay();
  return usage.count;
}

export function liveCapRemaining(): number {
  rollDay();
  if (simulateQuota() === "cap") return 0;
  return Math.max(0, DAILY_LIVE_CAP - usage.count);
}

/**
 * Reserve one live-search slot for today. Returns false when the daily cap
 * is already reached (caller must serve the quota fallback instead).
 * The slot is consumed BEFORE the run starts, so slow, failed or parallel
 * runs all count — the wallet is protected even under retries.
 */
export function consumeLiveSearch(): boolean {
  rollDay();
  if (liveCapRemaining() <= 0) return false;
  usage.count += 1;
  return true;
}

// ---------------------------------------------------------------------------
// Result cache (normalized input -> last live result)
// ---------------------------------------------------------------------------

const resultCache = new Map<string, MatchResult>();

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Cache key: normalized description + stage + country + sector. */
export function cacheKeyFor(input: FounderInput): string {
  return [
    normalizeText(input.description),
    normalizeText(input.stage),
    normalizeText(input.country),
    normalizeText(input.sector ?? ""),
  ].join("|");
}

export function getCachedResult(key: string): MatchResult | null {
  return resultCache.get(key) ?? null;
}

export function storeCachedResult(key: string, result: MatchResult): void {
  resultCache.set(key, result);
}

// ---------------------------------------------------------------------------
// Recent LIVE searches — the homepage's "free to re-open" list.
// Only genuine paid live runs are recorded (never presets, never demo mode,
// never quota fallbacks, never cache hits — those spent nothing). Summaries
// only: no result payload is kept here; re-opening goes through the cache
// above via POST /api/match with the same parameters.
// ---------------------------------------------------------------------------

export interface RecentLiveSearch {
  input: FounderInput;
  at: string; // ISO timestamp of the live run
}

const recentLive: RecentLiveSearch[] = [];
const MAX_RECENT_LIVE = 12;

export function recordLiveSearch(key: string, input: FounderInput): void {
  const existing = recentLive.findIndex((r) => cacheKeyFor(r.input) === key);
  if (existing >= 0) recentLive.splice(existing, 1);
  recentLive.unshift({ input, at: new Date().toISOString() });
  if (recentLive.length > MAX_RECENT_LIVE) recentLive.length = MAX_RECENT_LIVE;
}

export function listRecentLiveSearches(limit = 6): RecentLiveSearch[] {
  return recentLive.slice(0, limit);
}

// ---------------------------------------------------------------------------
// Test hook — quota simulation for local verification ONLY.
//
// Honoured only when FUNDING_RADAR_ENABLE_TEST_HOOKS=1 is set explicitly;
// the variable names are deliberately long and specific so they cannot be
// set by accident, and they must never be set on a production deployment
// (documented in README "Wallet protection"). Values:
//   FUNDING_RADAR_SIMULATE_QUOTA=cap      -> daily cap behaves as reached
//   FUNDING_RADAR_SIMULATE_QUOTA=credits  -> live run fails as if TinyFish
//                                            returned 402 INSUFFICIENT_CREDITS
// ---------------------------------------------------------------------------

export type QuotaSimulation = "cap" | "credits" | null;

export function simulateQuota(): QuotaSimulation {
  if (process.env.FUNDING_RADAR_ENABLE_TEST_HOOKS !== "1") return null;
  const v = process.env.FUNDING_RADAR_SIMULATE_QUOTA;
  return v === "cap" || v === "credits" ? v : null;
}
