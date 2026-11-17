"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { MatchResult } from "@/lib/types";
import { getLastResult } from "@/lib/storage";
import ResultsView from "@/components/ResultsView";

export default function ResultsPage() {
  const [result, setResult] = useState<MatchResult | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setResult(getLastResult());
    setLoaded(true);
  }, []);

  if (!loaded) {
    return (
      <div className="animate-pulse space-y-6" aria-label="Loading results">
        <div className="h-8 w-96 max-w-full rounded bg-panel2" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-panel" />)}
        </div>
        <div className="h-48 rounded-xl bg-panel" />
        <div className="h-48 rounded-xl bg-panel" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-line bg-panel p-8 text-center">
        <h1 className="text-xl font-semibold text-white">No result to show yet</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Results appear here after you run a search or load a demo preset. They are kept in this browser
          only, so opening this page in a fresh tab or a new device starts empty.
        </p>
        <Link href="/" className="mt-5 inline-block rounded-lg bg-mint px-4 py-2 text-sm font-semibold text-ink hover:bg-emerald-300">
          Describe your startup
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link href="/" className="no-print text-sm text-slate-400 underline-offset-2 hover:text-mint hover:underline">← New search</Link>
      <ResultsView result={result} />
    </div>
  );
}
