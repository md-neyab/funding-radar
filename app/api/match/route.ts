import { NextRequest, NextResponse } from "next/server";
import type { FounderInput, MatchResponse } from "@/lib/types";
import { hasTinyFishKey } from "@/lib/tinyfish";
import { demoResultFor, runMatch } from "@/lib/pipeline";
import { getPreset, PRESETS } from "@/lib/presets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Live mode: TinySet polling window + several TinyFish calls.
export const maxDuration = 300;

/**
 * GET /api/match — machine-readable access for other tools.
 *   ?preset=indian-fintech   -> that demo preset's full result as JSON
 *   (no params)              -> list of available presets + mode
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
  return NextResponse.json({
    mode: hasTinyFishKey() ? "live" : "demo",
    presets: PRESETS.map((p) => ({ id: p.id, label: p.label, tagline: p.tagline })),
    usage: "POST { description, stage, country, sector? } to run a match. GET ?preset=<id> returns a full sample result.",
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

  try {
    const result = hasTinyFishKey() ? await runMatch(input) : demoResultFor(input);
    const bodyOut: MatchResponse = { mode: result.mode, result };
    return NextResponse.json(bodyOut);
  } catch (e) {
    return NextResponse.json({ error: `Matching failed: ${e instanceof Error ? e.message : "unknown error"}. Please try again.` }, { status: 502 });
  }
}
