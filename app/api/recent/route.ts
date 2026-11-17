import { NextResponse } from "next/server";
import { hasTinyFishKey } from "@/lib/tinyfish";
import { listRecentLiveSearches } from "@/lib/quota";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/recent — the last live (paid) searches run on this server,
 * newest first, summaries only. Re-opening one is free: POST /api/match
 * with the same parameters hits the result cache and says so in its
 * pipeline log. Empty in demo mode (no key -> nothing live ever runs).
 */
export async function GET() {
  const searches = listRecentLiveSearches(6).map((r) => ({
    description: r.input.description,
    stage: r.input.stage,
    country: r.input.country,
    sector: r.input.sector ?? null,
    at: r.at,
  }));
  return NextResponse.json({ mode: hasTinyFishKey() ? "live" : "demo", searches });
}
