import Link from "next/link";
import FounderForm from "@/components/FounderForm";
import { RadarMark } from "@/components/ui";

const FEATURES = [
  {
    title: "Ranked for YOUR startup",
    body: "Not a generic “top 10 VCs” list. Every investor is scored against your stage, sector, country and the actual deals they did in the last 18 months — with the scoring shown.",
  },
  {
    title: "Proof for every match",
    body: "Each investor card lists the similar companies they backed, with round, amount, date and a clickable source. If a claim has no link behind it, it does not ship.",
  },
  {
    title: "Actionable detail",
    body: "Typical cheque size (labelled sourced or estimated), the partner to approach, and the realistic contact route — apply page, programme, or warm intro — per investor.",
  },
];

const STEPS = [
  { n: "1", title: "You describe your startup", body: "One paragraph, your stage and your country. That description drives everything downstream." },
  { n: "2", title: "TinySet builds the dataset", body: "Radar asks TinySet to build a dataset of similar companies that raised in the last 18 months — one row per company, each with its source URL." },
  { n: "3", title: "Search, Fetch & Agent enrich it", body: "TinyFish Search finds the announcements, Fetch reads them in full, and Agent verifies investor partners and contact routes on their own sites." },
  { n: "4", title: "Investors get ranked for you", body: "The investors behind those companies are aggregated and scored — stage fit, sector overlap, geography, recency — into your approach list." },
];

export default function HomePage() {
  return (
    <div className="space-y-20">
      <section className="pt-8 text-center sm:pt-14">
        <div className="mx-auto mb-6 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3.5 py-1.5 text-[12px] font-medium text-slate-300">
            <RadarMark size={16} /> Investor matching · Powered by TinyFish TinySet
          </span>
        </div>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl">
          Which investors already back <span className="text-mint">companies like yours</span>?
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-[16px] leading-relaxed text-slate-400">
          Describe your startup in one line. Funding Radar finds similar companies that raised in the last
          18 months, works out who funded them, and hands you a ranked list of investors to approach —
          with proof for every match.
        </p>
        <div className="mt-9">
          <FounderForm />
        </div>
      </section>

      <section aria-label="What you get" className="grid gap-4 md:grid-cols-3">
        {FEATURES.map((f) => (
          <article key={f.title} className="rounded-2xl border border-line bg-panel p-6 shadow-card">
            <h2 className="text-base font-semibold text-white">{f.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.body}</p>
          </article>
        ))}
      </section>

      <section aria-label="How it works" className="rounded-2xl border border-line bg-panel p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl font-semibold tracking-tight text-white">How the radar works</h2>
          <Link href="/methodology" className="text-sm font-medium text-mint underline-offset-2 hover:underline">
            TinySet, ranking &amp; limitations — full methodology →
          </Link>
        </div>
        <ol className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <li key={s.n}>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-mint/10 font-mono text-sm font-semibold text-mint ring-1 ring-inset ring-mint/30">{s.n}</span>
              <h3 className="mt-3 text-[15px] font-semibold text-white">{s.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-400">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-2xl border border-mint/25 bg-gradient-to-br from-mint/10 via-panel to-panel p-6 text-center sm:p-10">
        <h2 className="text-2xl font-semibold tracking-tight text-white">Take the shortlist with you</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-300">
          Every result exports as JSON or CSV — ranked investors and the comparable-companies dataset —
          and the same data is available over the API (<span className="font-mono text-[12px]">POST /api/match</span>),
          so your CRM, spreadsheet or agent can work with it directly.
        </p>
        <Link href="/methodology" className="mt-5 inline-block rounded-xl bg-mint px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-emerald-300">
          See how the ranking works
        </Link>
      </section>
    </div>
  );
}
