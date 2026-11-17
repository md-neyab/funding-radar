"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import type { MatchResult } from "@/lib/types";
import { DemoBanner } from "./ui";
import { isSavedInvestor, toggleSavedInvestor } from "@/lib/storage";

function toCSV(rows: string[][]): string {
  return rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
}

function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function investorsCSV(r: MatchResult): string {
  return toCSV([
    ["rank", "investor", "type", "match_score", "why_this_rank", "typical_cheque", "cheque_note", "lead_partner", "contact_route", "contact_url", "companies_backed", "proof_links"],
    ...r.investors.map((i) => [
      String(i.rank), i.name, i.type, String(i.matchScore), i.whyRank, i.chequeLabel, i.chequeNote,
      i.leadPartner ?? "", `${i.contactLabel} — ${i.contactNote}`, i.contactUrl ?? "",
      i.backed.map((b) => `${b.company} (${b.round}, ${b.amountLabel}, ${b.dateLabel})`).join("; "),
      i.backed.map((b) => b.proofUrl).join("; "),
    ]),
  ]);
}

function compsCSV(r: MatchResult): string {
  return toCSV([
    ["company", "what_it_does", "country", "round", "amount", "date", "investors", "source_url", "publisher"],
    ...r.comps.map((c) => [c.name, c.whatItDoes, c.country, c.round, c.amountLabel, c.dateLabel, c.investors.join("; "), c.sourceUrl, c.publisher]),
  ]);
}

function summaryText(r: MatchResult): string {
  const lines = [
    `Funding Radar — investor matches for: "${r.input.description}" (${r.input.stage}, ${r.input.country})`,
    `Generated ${new Date(r.generatedAt).toLocaleString()} · Mode: ${r.mode} · ${r.comps.length} comparable companies, ${r.investors.length} ranked investors`,
    "",
    "Ranked investors:",
  ];
  for (const i of r.investors) {
    lines.push(`${i.rank}. ${i.name} (${i.type}) — match ${i.matchScore}/100`);
    lines.push(`   Why: ${i.whyRank}`);
    lines.push(`   Cheque: ${i.chequeLabel} · Partner: ${i.leadPartner ?? "see card"} · Contact: ${i.contactLabel}`);
    lines.push(`   Backed: ${i.backed.map((b) => `${b.company} (${b.round} ${b.amountLabel}, ${b.dateLabel}) ${b.proofUrl}`).join(" | ")}`);
  }
  return lines.join("\n");
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? "text-mint" : score >= 65 ? "text-sky2" : "text-amber2";
  return (
    <div className="flex flex-col items-center">
      <span className={`text-2xl font-bold ${color}`}>{score}</span>
      <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">match</span>
    </div>
  );
}

export default function ResultsView({ result: r }: { result: MatchResult }) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [expandedComp, setExpandedComp] = useState<string | null>(null);
  const [showSteps, setShowSteps] = useState(false);

  useEffect(() => {
    const map: Record<string, boolean> = {};
    for (const i of r.investors) map[i.name] = isSavedInvestor(i.name);
    setSaved(map);
  }, [r]);

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(summaryText(r));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { setCopied(false); }
  }

  return (
    <div className="space-y-8">
      {r.mode === "demo" && <DemoBanner />}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-[13px] font-medium uppercase tracking-wider text-mint">
            {r.mode === "demo" ? "Sample result" : "Live result"} · {new Date(r.generatedAt).toLocaleString()}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">Investors who back companies like yours</h1>
          <p className="mt-2 rounded-xl border border-line bg-panel px-4 py-3 text-sm leading-relaxed text-slate-300">
            “{r.input.description}”
            <span className="mt-1 block text-[12px] text-slate-500">{r.input.stage} · {r.input.country}{r.input.sector ? ` · ${r.input.sector}` : ""}</span>
          </p>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <button type="button" onClick={copySummary} className="rounded-lg border border-line bg-panel px-3.5 py-2 text-sm font-medium text-slate-200 transition hover:border-mint/40 hover:text-mint">{copied ? "Copied ✓" : "Copy summary"}</button>
          <button type="button" onClick={() => download("funding-radar-result.json", JSON.stringify(r, null, 2), "application/json")} className="rounded-lg border border-line bg-panel px-3.5 py-2 text-sm font-medium text-slate-200 transition hover:border-mint/40 hover:text-mint">JSON</button>
          <button type="button" onClick={() => download("funding-radar-investors.csv", investorsCSV(r), "text/csv")} className="rounded-lg border border-line bg-panel px-3.5 py-2 text-sm font-medium text-slate-200 transition hover:border-mint/40 hover:text-mint">Investors CSV</button>
          <button type="button" onClick={() => download("funding-radar-comparables.csv", compsCSV(r), "text/csv")} className="rounded-lg border border-line bg-panel px-3.5 py-2 text-sm font-medium text-slate-200 transition hover:border-mint/40 hover:text-mint">Companies CSV</button>
          <button type="button" onClick={() => window.print()} className="rounded-lg border border-line bg-panel px-3.5 py-2 text-sm font-medium text-slate-200 transition hover:border-mint/40 hover:text-mint">Print / PDF</button>
        </div>
      </div>

      {r.status === "no_matches" && (
        <div className="rounded-xl border border-line bg-panel p-6" role="alert">
          <h2 className="text-lg font-semibold text-white">No matches to show for this description yet</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-400">
            {r.mode === "demo"
              ? "This build is in demo mode: full sample results exist for the three preset startups on the home page. Add a TinyFish API key on the server and this exact description gets researched live — TinySet dataset, Search, Fetch and Agent."
              : "Radar could not verify enough comparable companies with proof links for this description. Try naming the sector and customer more concretely (for example “AI code-review tool for engineering teams” rather than “AI tool”), or re-run shortly — the TinySet dataset may still be building."}
          </p>
          <Link href="/" className="mt-4 inline-block rounded-lg bg-mint px-4 py-2 text-sm font-semibold text-ink hover:bg-emerald-300">Back to the form</Link>
        </div>
      )}

      {r.status === "few_matches" && (
        <div className="rounded-xl border border-amber2/40 bg-amber2/10 px-4 py-3 text-sm leading-relaxed text-amber-100" role="alert">
          <strong className="font-semibold text-amber2">Partial result:</strong> only {r.comps.length} comparable companies carried verifiable proof links in this run (the target is 10+). The ranking below is real but thinner than usual — treat it as a starting shortlist, and re-run later for a fuller dataset.
        </div>
      )}

      {r.comps.length > 0 && (
        <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Result summary">
            {[
              ["Comparable companies", String(r.comps.length), "raised in the last 18 months"],
              ["Investors ranked", String(r.investors.length), "scored for your stage & sector"],
              ["Top match score", r.investors[0] ? `${r.investors[0].matchScore}/100` : "—", r.investors[0]?.name ?? ""],
              ["Proof links", String(r.comps.length), "one per comparable — all clickable"],
            ].map(([k, v, sub]) => (
              <div key={k} className="rounded-xl border border-line bg-panel p-4 shadow-card">
                <p className="text-[12px] font-medium uppercase tracking-wider text-slate-500">{k}</p>
                <p className="mt-1 truncate text-2xl font-bold text-white">{v}</p>
                <p className="mt-1 truncate text-[12px] text-slate-400">{sub}</p>
              </div>
            ))}
          </section>

          <section className="rounded-xl border border-line bg-panel p-5" aria-label="How this result was built">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">How this shortlist was built</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              <strong className="text-white">TinySet</strong> {r.tinyset.attempted ? <>dataset <span className="font-mono text-[12px]">{r.tinyset.datasetId ?? ""}</span> supplied {r.tinyset.rowsUsed} comparable rows. </> : <>supplies the comparable-companies dataset in live mode. </>}
              <strong className="text-white">Search</strong> found the funding announcements, <strong className="text-white">Fetch</strong> read the strongest pages in full,
              and <strong className="text-white">Agent</strong> verified investor details where possible. Ranking is computed from the dataset — never a hand-written league table.{" "}
              <Link href="/methodology" className="text-mint underline-offset-2 hover:underline">Full methodology →</Link>
            </p>
            {r.caveats.length > 0 && (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-[13px] leading-relaxed text-slate-400">
                {r.caveats.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            )}
          </section>

          {/* Ranked investors */}
          <section aria-label="Ranked investors">
            <h2 className="text-xl font-semibold tracking-tight text-white">Ranked investors to approach</h2>
            <ol className="mt-4 space-y-4">
              {r.investors.map((inv) => (
                <li key={inv.name} className="rounded-2xl border border-line bg-panel p-5 shadow-card">
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center gap-1">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-mint/10 font-mono text-sm font-bold text-mint ring-1 ring-inset ring-mint/30">#{inv.rank}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <h3 className="text-lg font-semibold text-white">{inv.name}</h3>
                        <span className="rounded-full bg-panel2 px-2.5 py-0.5 text-[11px] font-medium text-slate-300 ring-1 ring-inset ring-line">{inv.type}</span>
                        {inv.sample && <span className="rounded-full bg-amber2/10 px-2 py-0.5 text-[11px] font-medium text-amber2 ring-1 ring-inset ring-amber2/30">Sample data</span>}
                        <button
                          type="button"
                          onClick={() => { toggleSavedInvestor(inv.name); setSaved((s) => ({ ...s, [inv.name]: !s[inv.name] })); }}
                          className={`no-print ml-auto rounded-lg border px-3 py-1.5 text-[13px] font-medium transition ${saved[inv.name] ? "border-mint/50 bg-mint/10 text-mint" : "border-line text-slate-300 hover:border-mint/40 hover:text-mint"}`}
                          aria-pressed={!!saved[inv.name]}
                        >
                          {saved[inv.name] ? "★ Saved" : "☆ Save"}
                        </button>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-slate-300"><span className="font-medium text-slate-100">Why #{inv.rank}:</span> {inv.whyRank}</p>
                      <details className="mt-2">
                        <summary className="cursor-pointer text-[13px] font-medium text-sky2 hover:text-mint">How the score was computed</summary>
                        <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-[13px] text-slate-400">
                          {inv.scoreFactors.map((f, i) => <li key={i}>{f}</li>)}
                        </ul>
                      </details>
                      <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                        <div className="rounded-lg bg-panel2 px-3 py-2.5">
                          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Typical cheque</p>
                          <p className="mt-0.5 font-medium text-slate-100">{inv.chequeLabel}</p>
                          <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">{inv.chequeNote}</p>
                        </div>
                        <div className="rounded-lg bg-panel2 px-3 py-2.5">
                          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Partner to approach</p>
                          <p className="mt-0.5 font-medium text-slate-100">{inv.leadPartner ?? "Find via team page"}</p>
                          <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">{inv.partnerNote}</p>
                        </div>
                        <div className="rounded-lg bg-panel2 px-3 py-2.5">
                          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">How to reach them</p>
                          <p className="mt-0.5 font-medium text-slate-100">
                            {inv.contactUrl ? <a href={inv.contactUrl} target="_blank" rel="noreferrer" className="text-sky2 underline decoration-sky2/40 underline-offset-2 hover:text-mint">{inv.contactLabel} ↗</a> : inv.contactLabel}
                          </p>
                          <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">{inv.contactNote}</p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <p className="text-[12px] font-medium uppercase tracking-wider text-slate-500">Backed these similar companies — proof</p>
                        <ul className="mt-1.5 flex flex-wrap gap-2">
                          {inv.backed.map((b) => (
                            <li key={b.company}>
                              <a href={b.proofUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-line bg-ink px-3 py-1.5 text-[12px] text-slate-200 transition hover:border-mint/50 hover:text-mint" title={`${b.company} — ${b.round}, ${b.amountLabel}, ${b.dateLabel}`}>
                                <span className="font-medium">{b.company}</span>
                                <span className="text-slate-500">{b.round} · {b.amountLabel} · {b.dateLabel}</span>
                                <span aria-hidden="true">↗</span>
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <ScoreRing score={inv.matchScore} />
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* Comparable companies */}
          <section aria-label="Comparable companies">
            <h2 className="text-xl font-semibold tracking-tight text-white">The comparable companies behind the ranking</h2>
            <p className="mt-1 text-sm text-slate-400">The TinySet-shaped dataset for this search: companies like yours that raised in the last 18 months. Tap a row for its funding facts. Every row carries its proof link.</p>
            <div className="mt-4 overflow-x-auto rounded-xl border border-line">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-panel2 text-[12px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Company</th>
                    <th className="px-4 py-3 font-medium">Round</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Investors</th>
                    <th className="px-4 py-3 font-medium">Proof</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60 bg-panel">
                  {r.comps.map((c) => (
                    <Fragment key={c.name}>
                      <tr
                        className="cursor-pointer transition hover:bg-panel2/60 focus:bg-panel2/60 focus:outline-none"
                        tabIndex={0}
                        role="button"
                        aria-expanded={expandedComp === c.name}
                        aria-label={`${c.name} — funding details`}
                        onClick={() => setExpandedComp(expandedComp === c.name ? null : c.name)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpandedComp(expandedComp === c.name ? null : c.name); } }}
                      >
                        <td className="px-4 py-3">
                          <span className="font-medium text-slate-100">{c.name}</span>
                          <span className="block max-w-[260px] truncate text-[12px] text-slate-500">{c.whatItDoes}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-300">{c.round}</td>
                        <td className="px-4 py-3 font-medium text-mint">{c.amountLabel}</td>
                        <td className="px-4 py-3 text-slate-300">{c.dateLabel}</td>
                        <td className="px-4 py-3 text-slate-300">{c.investors.join(", ") || "Not named in source"}</td>
                        <td className="px-4 py-3">
                          <a href={c.sourceUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-sky2 underline decoration-sky2/40 underline-offset-2 hover:text-mint">{c.publisher} ↗</a>
                        </td>
                      </tr>
                      {expandedComp === c.name && (
                        <tr>
                          <td colSpan={6} className="bg-panel2/50 px-4 py-3 text-[13px] leading-relaxed text-slate-300">
                            <strong className="text-white">{c.name}</strong> — {c.whatItDoes}. Based in {c.country || "—"}.
                            Raised {c.amountLabel} in a {c.round} round ({c.dateLabel})
                            {c.investors.length ? <> with {c.investors.join(", ")} participating</> : null}.
                            Source: <a href={c.sourceUrl} target="_blank" rel="noreferrer" className="text-sky2 underline underline-offset-2">{c.sourceTitle}</a>
                            {c.fetched ? " · Read in full via TinyFish Fetch." : ""}
                            {c.sample ? " · Sample row (demo preset)." : ""}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* Pipeline log */}
      {r.steps.length > 0 && (
        <section className="no-print rounded-xl border border-line bg-panel p-5" aria-label="Pipeline log">
          <button type="button" onClick={() => setShowSteps((v) => !v)} className="flex w-full items-center justify-between text-left" aria-expanded={showSteps}>
            <span className="text-sm font-semibold uppercase tracking-wider text-slate-300">Pipeline log — what actually ran</span>
            <span className="text-slate-400">{showSteps ? "−" : "+"}</span>
          </button>
          {showSteps && (
            <ol className="mt-4 space-y-3">
              {r.steps.map((s) => (
                <li key={s.id} className="flex gap-3 text-sm">
                  <span className={s.status === "failed" ? "text-rose2" : s.status === "skipped" ? "text-slate-500" : "text-mint"}>{s.status === "failed" ? "✕" : s.status === "skipped" ? "–" : "✓"}</span>
                  <span>
                    <span className="font-medium text-slate-100">{s.label}</span>
                    {s.endpoint && <span className="ml-2 rounded bg-panel2 px-1.5 py-0.5 font-mono text-[11px] text-sky2">{s.endpoint}</span>}
                    <span className="block text-[13px] leading-relaxed text-slate-400">{s.detail}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
    </div>
  );
}
