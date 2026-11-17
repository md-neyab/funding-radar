"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getRecentSearches, getSavedInvestors, toggleSavedInvestor, type RecentSearch } from "@/lib/storage";

export default function SavedPage() {
  const [investors, setInvestors] = useState<string[]>([]);
  const [recent, setRecent] = useState<RecentSearch[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setInvestors(getSavedInvestors());
    setRecent(getRecentSearches());
    setLoaded(true);
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Saved</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-400">
          Your saved investors and recent searches — stored only in this browser, no account needed.
        </p>
      </div>

      {!loaded && <div className="h-32 animate-pulse rounded-xl bg-panel" aria-label="Loading" />}

      {loaded && (
        <>
          <section aria-label="Saved investors">
            <h2 className="text-lg font-semibold text-white">Saved investors</h2>
            {investors.length === 0 ? (
              <div className="mt-3 rounded-xl border border-dashed border-line bg-panel p-6 text-center">
                <p className="text-sm leading-relaxed text-slate-400">
                  Nothing saved yet. On any result, tap <span className="text-slate-200">☆ Save</span> on an investor card
                  and they will wait for you here while you prepare outreach.
                </p>
                <Link href="/" className="mt-4 inline-block rounded-lg bg-mint px-4 py-2 text-sm font-semibold text-ink hover:bg-emerald-300">Find investors</Link>
              </div>
            ) : (
              <ul className="mt-3 divide-y divide-line/60 rounded-xl border border-line bg-panel">
                {investors.map((name) => (
                  <li key={name} className="flex items-center justify-between px-4 py-3">
                    <span className="text-[15px] font-medium text-white">★ {name}</span>
                    <button
                      type="button"
                      onClick={() => setInvestors(toggleSavedInvestor(name))}
                      className="rounded-lg px-2 py-1.5 text-sm text-slate-400 transition hover:text-rose2"
                      aria-label={`Remove ${name} from saved investors`}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Recent searches">
            <h2 className="text-lg font-semibold text-white">Recent searches</h2>
            {recent.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-line bg-panel p-6 text-center text-sm text-slate-400">
                No searches yet on this device. Your last result is always one tap away under “Results” after a search.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-line/60 rounded-xl border border-line bg-panel">
                {recent.map((r, i) => (
                  <li key={i} className="px-4 py-3">
                    <p className="line-clamp-2 text-sm text-slate-200">{r.input.description}</p>
                    <p className="mt-0.5 text-[12px] text-slate-500">
                      {r.input.stage} · {r.input.country}
                      {r.topInvestor ? <> · Top match: <span className="text-mint">{r.topInvestor}</span></> : null}
                      {" · "}{new Date(r.at).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-[13px] text-slate-500">
              Tip: your most recent full result (ranked list + dataset) is kept at{" "}
              <Link href="/results" className="text-mint underline-offset-2 hover:underline">/results</Link> until you run a new search.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
