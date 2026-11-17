import { NextRequest, NextResponse } from "next/server";
import type { FounderInput, MatchResponse } from "@/lib/types";
import { hasTinyFishKey } from "@/lib/tinyfish";
import { demoResultFor, quotaFallbackResult, runMatch } from "@/lib/pipeline";
import { getPreset, PRESETS } from "@/lib/presets";
import {
  DAILY_LIVE_CAP,
  cacheKeyFor,
  consumeLiveSearch,
  getCachedResult,
  liveCapRemaining,
  liveSearchesUsedToday,
  recordLiveSearch,
  storeCachedResult,
} from "@/lib/quota";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Live mode: TinySet polling window + several TinyFish calls.
export const maxDuration = 300;

/**
 * GET /api/match — machine-readable access for other tools.
 *   ?preset=indian-fintech   -> that demo preset's full result as JSON
 *   (no params)              -> list of available presets + mode (+ live budget)
 */
export async function GET(req: NextRequest) {
  const presetId = req.nextUrl.searchParams.get("preset");
  if (presetId) {
    const preset = getPreset(presetId);
    if (!preset) {
      return NextResponse.json({ error: `Unknown preset "${presetId}". Available: ${PRESETS.map((p) => p.id).join(", ")}` }, { status: 404 });
    }
    const body: MatchResponse = { mode: "demo", result: preset.result };
    return NextResponse.json(body);
  }
  const live = hasTinyFishKey();
  return NextResponse.json({
    mode: live ? "live" : "demo",
    presets: PRESETS.map((p) => ({ id: p.id, label: p.label, tagline: p.tagline })),
    ...(live
      ? {
          liveBudget: {
            capPerDay: DAILY_LIVE_CAP,
            usedToday: liveSearchesUsedToday(),
            remainingToday: liveCapRemaining(),
            note: "Live searches are capped per UTC day to protect the TinyFish wallet; repeats of a search are served from cache for free. When the budget is used up, POST returns a worked example flagged notice: \"live-quota\" instead of an error.",
          },
        }
      : {}),
    usage: "POST { description, stage, country, sector? } to run a match. GET ?preset=<id> returns a full sample result. GET /api/recent lists recent live searches (free to re-open via the cache).",
  });
}

/** POST /api/match — run investor matching for a founder description. */
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body?.presetId === "string") {
    const preset = getPreset(body.presetId);
    if (!preset) return NextResponse.json({ error: `Unknown preset "${body.presetId}".` }, { status: 404 });
    const bodyOut: MatchResponse = { mode: "demo", result: preset.result };
    return NextResponse.json(bodyOut);
  }

  const input: FounderInput = {
    description: typeof body?.description === "string" ? body.description.trim().replace(/\s+/g, " ") : "",
    stage: typeof body?.stage === "string" && body.stage ? body.stage : "Seed",
    country: typeof body?.country === "string" && body.country.trim() ? body.country.trim() : "India",
    sector: typeof body?.sector === "string" ? body.sector.trim() : undefined,
  };
  if (input.description.length < 10) {
    return NextResponse.json({ error: "Describe your startup in a line or two — what it does, who it is for. At least a sentence; the ranking is only as good as this description." }, { status: 400 });
  }
  if (input.description.length > 600) {
    return NextResponse.json({ error: "Keep the description under 600 characters — one sharp paragraph beats a pitch deck here." }, { status: 400 });
  }

  // Demo mode: no key, no wallet, no cap — unchanged behaviour.
  if (!hasTinyFishKey()) {
    const result = demoResultFor(input);
    const bodyOut: MatchResponse = { mode: result.mode, result };
    return NextResponse.json(bodyOut);
  }

  // Wallet protection (lib/quota.ts), in order:
  // 1) Cache — a repeat of the same normalized search is free and does NOT
  //    count against the daily cap.
  const key = cacheKeyFor(input);
  const cached = getCachedResult(key);
  if (cached) {
    const result = structuredClone(cached);
    result.steps = [
      { id: "cache", label: "Served from cache — no TinyFish credits spent", detail: "This exact search already ran live today, so the stored result is re-served for free. Cache hits never count against the daily live-search cap.", status: "done", ms: 0 },
      ...result.steps,
    ];
    const bodyOut: MatchResponse = { mode: result.mode, result };
    return NextResponse.json(bodyOut);
  }

  // 2) Daily cap — reserve the slot BEFORE running, so slow, failed or
  //    parallel runs all count. Cap reached -> graceful worked example.
  if (!consumeLiveSearch()) {
    const result = quotaFallbackResult(input, [], "daily-cap");
    const bodyOut: MatchResponse = { mode: result.mode, result };
    return NextResponse.json(bodyOut);
  }

  // 3) Live run. Genuine live results are cached and listed under
  //    "Recent live searches"; quota fallbacks (credits ran out mid-run)
  //    are neither cached nor listed — they are not live results.
  try {
    const result = await runMatch(input);
    if (result.mode === "live" && !result.notice) {
      storeCachedResult(key, result);
      recordLiveSearch(key, input);
    }
    const bodyOut: MatchResponse = { mode: result.mode, result };
    return NextResponse.json(bodyOut);
  } catch (e) {
    return NextResponse.json({ error: `Matching failed: ${e instanceof Error ? e.message : "unknown error"}. Please try again.` }, { status: 502 });
  }
}
