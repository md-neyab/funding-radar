"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { FounderInput, MatchResponse, PipelineStep } from "@/lib/types";
import { PRESETS } from "@/lib/presets";
import { getRecentSearches, pushRecentSearch, saveLastResult, type RecentSearch } from "@/lib/storage";

const STAGES = ["Idea", "Pre-seed", "Seed", "Series A", "Series B+"];
const COUNTRIES = ["India", "United States", "United Kingdom", "Singapore", "UAE", "Germany", "Canada", "Australia", "Indonesia", "Brazil", "Other"];

type Phase = "idle" | "running" | "error";

const LIVE_STEPS: PipelineStep[] = [
  { id: "s-tinyset", label: "TinySet — building your comparable-companies dataset", detail: "Agents collect startups like yours that raised in the last 18 months — each row with its source link. This is the slow, thorough step.", status: "done", ms: 0, endpoint: "TinySet" },
  { id: "s-search", label: "TinyFish Search — funding announcements & investor research", detail: "Searching for raises by similar companies, plus each investor's cheque size, partners and contact route.", status: "done", ms: 0, endpoint: "Search" },
  { id: "s-fetch", label: "TinyFish Fetch — reading the strongest sources in full", detail: "Opening articles and investor pages end-to-end so figures come from pages, not snippets.", status: "done", ms: 0, endpoint: "Fetch" },
  { id: "s-rank", label: "Ranking investors for your startup", detail: "Scoring every investor behind those companies on stage fit, sector overlap, geography and recency.", status: "done", ms: 0, endpoint: "Rank" },
];

export default function FounderForm() {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [stage, setStage] = useState("Seed");
  const [country, setCountry] = useState("India");
  const [sector, setSector] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [visibleSteps, setVisibleSteps] = useState<PipelineStep[]>([]);
  const [recent, setRecent] = useState<RecentSearch[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    setRecent(getRecentSearches());
    return () => timers.current.forEach(clearTimeout);
  }, []);

  async function post(body: unknown): Promise<MatchResponse> {
    const res = await fetch("/api/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as MatchResponse;
    if (!res.ok || data.error) throw new Error(data.error ?? `Request failed (${res.status})`);
    if (!data.result) throw new Error("No result came back. Please try again.");
    return data;
  }

  async function runPreset(presetId: string) {
    setPhase("running");
    setError("");
    setVisibleSteps([]);
    try {
      const data = await post({ presetId });
      saveLastResult(data.result!);
      pushRecentSearch(data.result!.input, presetId, data.result!.investors[0]?.name);
      router.push("/results");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setPhase("error");
    }
  }

  async function runCustom() {
    const desc = description.trim().replace(/\s+/g, " ");
    if (desc.length < 10) {
      setError("Describe your startup in at least a sentence — what it does and who it is for. The ranking is only as good as this description.");
      setPhase("error");
      return;
    }
    const input: FounderInput = { description: desc, stage, country, sector: sector.trim() || undefined };
    setPhase("running");
    setError("");
    setVisibleSteps([]);
    timers.current.forEach(clearTimeout);
    LIVE_STEPS.forEach((s, i) => {
      timers.current.push(setTimeout(() => setVisibleSteps((v) => [...v, s]), 400 + i * 1400));
    });
    try {
      const data = await post(input);
      saveLastResult(data.result!);
      pushRecentSearch(input, data.result!.presetId, data.result!.investors[0]?.name);
      router.push("/results");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong while matching. Please try again.");
      setPhase("error");
    }
  }

  const inputCls = "w-full rounded-xl border border-line bg-panel px-4 py-3 text-[15px] text-white placeholder:text-slate-500 shadow-card outline-none transition focus:border-mint/60 focus:ring-2 focus:ring-mint/25";

  return (
    <div className="w-full">
      <form
        onSubmit={(e) => { e.preventDefault(); runCustom(); }}
        className="mx-auto max-w-2xl space-y-3 text-left"
      >
        <div>
          <label htmlFor="desc" className="mb-1.5 block text-sm font-medium text-slate-200">Describe your startup</label>
          <textarea
            id="desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={600}
            placeholder="e.g. Payments and expense-management app for small businesses in India — UPI collections, payouts and automated bookkeeping for SMBs."
            className={`${inputCls} resize-y leading-relaxed`}
          />
          <p className="mt-1 flex justify-between text-[12px] text-slate-500">
            <span>One sharp paragraph: what it does, who pays, why now.</span>
            <span>{description.length}/600</span>
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="stage" className="mb-1.5 block text-sm font-medium text-slate-200">Stage</label>
            <select id="stage" value={stage} onChange={(e) => setStage(e.target.value)} className={inputCls}>
              {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="country" className="mb-1.5 block text-sm font-medium text-slate-200">Country</label>
            <select id="country" value={country} onChange={(e) => setCountry(e.target.value)} className={inputCls}>
              {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label htmlFor="sector" className="mb-1.5 block text-sm font-medium text-slate-200">Sector <span className="text-slate-500">(optional)</span></label>
            <input id="sector" value={sector} onChange={(e) => setSector(e.target.value)} placeholder="Fintech, AI devtools…" className={inputCls} maxLength={60} />
          </div>
        </div>
        <button
          type="submit"
          disabled={phase === "running"}
          className="w-full rounded-xl bg-mint px-6 py-3.5 text-[15px] font-semibold text-ink transition hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-60 sm:w-auto sm:px-8"
        >
          {phase === "running" ? "Matching investors…" : "Find my investors →"}
        </button>
      </form>

      <div className="mx-auto mt-10 max-w-3xl">
        <h2 className="text-center text-[13px] font-medium uppercase tracking-wider text-slate-500">Or load a worked example — one click</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={phase === "running"}
              onClick={() => runPreset(p.id)}
              className="rounded-xl border border-line bg-panel p-4 text-left shadow-card transition hover:border-mint/50 hover:shadow-glow disabled:opacity-50"
            >
              <span className="text-sm font-semibold text-white">{p.label}</span>
              <span className="mt-1 block text-[13px] leading-relaxed text-slate-400">{p.tagline}</span>
              <span className="mt-2 block text-[12px] font-medium text-mint">Load demo result →</span>
            </button>
          ))}
        </div>
      </div>

      {recent.length > 0 && phase !== "running" && (
        <div className="mx-auto mt-10 max-w-2xl text-left">
          <h2 className="text-[13px] font-medium uppercase tracking-wider text-slate-500">Your recent searches</h2>
          <ul className="mt-2 divide-y divide-line/60 rounded-xl border border-line bg-panel">
            {recent.map((r, i) => (
              <li key={i} className="px-4 py-3">
                <p className="line-clamp-1 text-sm text-slate-200">{r.input.description}</p>
                <p className="mt-0.5 text-[12px] text-slate-500">
                  {r.input.stage} · {r.input.country}
                  {r.topInvestor ? <> · Top match: <span className="text-mint">{r.topInvestor}</span></> : null}
                  {" · "}{new Date(r.at).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {phase === "running" && (
        <div className="mx-auto mt-8 max-w-2xl rounded-xl border border-line bg-panel p-5 text-left" aria-live="polite">
          <div className="mb-4 flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-60" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-mint" />
            </span>
            <p className="text-sm font-medium text-white">Radar is building your dataset and ranking investors…</p>
          </div>
          <ol className="space-y-3">
            {visibleSteps.map((s) => (
              <li key={s.id} className="flex gap-3 text-sm">
                <span className="mt-0.5 text-mint">✓</span>
                <span>
                  <span className="font-medium text-slate-100">{s.label}</span>
                  {s.endpoint && <span className="ml-2 rounded bg-panel2 px-1.5 py-0.5 font-mono text-[11px] text-sky2">{s.endpoint}</span>}
                  <span className="block text-[13px] leading-relaxed text-slate-400">{s.detail}</span>
                </span>
              </li>
            ))}
            {visibleSteps.length < LIVE_STEPS.length && <li className="flex gap-3 text-sm text-slate-500"><span className="mt-0.5 animate-pulse">•</span><span>Working… live runs can take a minute or two while the dataset builds.</span></li>}
          </ol>
        </div>
      )}

      {phase === "error" && (
        <div className="mx-auto mt-8 max-w-2xl rounded-xl border border-rose2/40 bg-rose2/10 px-4 py-3 text-left text-sm leading-relaxed text-rose-100" role="alert">
          <p>{error}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => runPreset("indian-fintech")}
              className="rounded-lg bg-mint px-4 py-2 text-sm font-semibold text-ink transition hover:bg-emerald-300"
            >
              See a demo result
            </button>
            <a
              href="#recent-live"
              className="rounded-lg border border-rose2/40 px-4 py-2 text-sm font-medium text-rose-100 transition hover:border-mint/40 hover:text-mint"
            >
              Recent results
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
