"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { FounderInput, MatchResponse } from "@/lib/types";
import { pushRecentSearch, saveLastResult } from "@/lib/storage";

interface RecentItem {
  description: string;
  stage: string;
  country: string;
  sector: string | null;
  at: string;
}

/**
 * "Recent live searches" — the last LIVE (paid) searches run on this server,
 * from GET /api/recent. Re-opening one is free: it POSTs the same parameters
 * to /api/match, which serves the stored result from cache (the pipeline
 * log says so) instead of spending TinyFish credits again.
 * Renders nothing when the list is empty — always the case in demo mode.
 */
export default function RecentLiveSearches() {
  const router = useRouter();
  const [items, setItems] = useState<RecentItem[]>([]);
  const [opening, setOpening] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/recent", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data?.searches)) setItems(data.searches);
      } catch {
        // Section is an enhancement — stay silent if it cannot load.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function open(item: RecentItem, idx: number) {
    setOpening(idx);
    setError("");
    try {
      const input: FounderInput = {
        description: item.description,
        stage: item.stage,
        country: item.country,
        sector: item.sector ?? undefined,
      };
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = (await res.json()) as MatchResponse;
      if (!res.ok || data.error || !data.result) throw new Error(data.error ?? "Could not re-open that search.");
      saveLastResult(data.result);
      pushRecentSearch(data.result.input, data.result.presetId, data.result.investors[0]?.name);
      router.push("/results");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not re-open that search. Please try again.");
      setOpening(null);
    }
  }

  if (items.length === 0) return null;

  return (
    <section id="recent-live" aria-label="Recent live searches" className="mx-auto w-full max-w-3xl scroll-mt-24">
      <h2 className="text-center text-[13px] font-medium uppercase tracking-wider text-slate-500">
        Recent live searches — free to re-open, no credits spent
      </h2>
      <p className="mx-auto mt-1.5 max-w-xl text-center text-[13px] leading-relaxed text-slate-500">
        These searches already ran live (and already spent their credits). Re-opening one serves the
        stored result from cache — the pipeline log shows the cache hit.
      </p>
      <ul className="mt-4 grid gap-3 text-left sm:grid-cols-2">
        {items.map((item, i) => (
          <li key={`${item.at}-${i}`}>
            <button
              type="button"
              disabled={opening !== null}
              onClick={() => open(item, i)}
              className="h-full w-full rounded-xl border border-line bg-panel p-4 shadow-card transition hover:border-mint/50 hover:shadow-glow disabled:opacity-50"
            >
              <span className="line-clamp-2 text-sm leading-relaxed text-slate-100">{item.description}</span>
              <span className="mt-2 block text-[12px] text-slate-500">
                {item.stage} · {item.country}
                {item.sector ? ` · ${item.sector}` : ""} · {new Date(item.at).toLocaleString()}
              </span>
              <span className="mt-2 block text-[12px] font-medium text-mint">
                {opening === i ? "Opening from cache…" : "Re-open result — free →"}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {error && (
        <p className="mt-3 rounded-xl border border-rose2/40 bg-rose2/10 px-4 py-3 text-sm leading-relaxed text-rose-100" role="alert">{error}</p>
      )}
    </section>
  );
}
