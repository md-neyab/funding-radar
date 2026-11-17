import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Methodology — Funding Radar",
  description: "How Funding Radar uses TinySet plus TinyFish Search, Fetch and Agent to build a comparable-companies dataset and rank investors for a described startup — and its honest limitations.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-panel p-6 sm:p-7">
      <h2 className="text-lg font-semibold tracking-tight text-white">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

const code = "rounded bg-black/30 px-1 font-mono text-[12px]";

export default function MethodologyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Methodology</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-400">
          Funding Radar answers one question: <em>“Investors who funded companies like mine recently — who are
          they, and who should I approach first?”</em> This page explains exactly how the answer is produced,
          including where TinySet fits and where the tool can be wrong.
        </p>
      </div>

      <Section title="Step 1 — TinySet builds the comparable-companies dataset">
        <p>
          The core of Radar is a dataset, and it is built with <strong className="text-white">TinySet</strong> —
          TinyFish's dataset builder. Radar calls the Datasets API
          (<code className={code}>POST agent.tinyfish.ai/v1/datasets</code>) with a spec it defines itself:
          eight columns — company (key), what it does, country, round, amount in USD, date, investors, and a{" "}
          <strong className="text-white">required source URL</strong> — plus a scope written from your
          description: startups similar to yours, in your market, that announced a round in the last 18 months.
        </p>
        <p>
          TinySet's agents then build that dataset from the live web. Rows stream in over minutes (a typical
          build takes 5–20 minutes), so Radar polls the dataset, reads back whatever rows have landed via{" "}
          <code className={code}>GET /v1/datasets/{"{id}"}/rows</code>, and records the dataset ID in your
          result — the run is verifiable in the TinyFish dashboard. Rows without a source URL are dropped:
          no proof link, no match.
        </p>
        <p>
          Because founders will not wait 20 minutes, Search and Fetch (below) run in parallel and top the
          dataset up. Radar requests 10 rows per dataset — the brief's 10-comparable minimum — so the
          dataset cost of a live run is about $1.00 at $0.10/row. If a TinySet build fails for a
          non-credits reason, the pipeline log says so plainly and the Search/Fetch path builds the same
          dataset shape on its own. Radar never pretends a TinySet run happened when it did not.
        </p>
      </Section>

      <Section title="Wallet protection — why live search sometimes rests">
        <p>
          This site runs on a small prepaid TinyFish wallet, and anyone can use it — so live search is
          guarded, by design:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li><strong className="text-white">A daily budget.</strong> At most 8 live searches run per day (UTC). The slot is reserved before a run starts, so retries and parallel runs count too.</li>
          <li><strong className="text-white">Repeats are free.</strong> Running the same search again is served from a server-side cache — the pipeline log shows “Served from cache — no TinyFish credits spent” — and never counts against the budget. Completed live searches are listed on the home page as “Recent live searches”, free for anyone to re-open.</li>
          <li><strong className="text-white">An empty wallet is not an error page.</strong> When the day's budget is used up, or TinyFish reports insufficient credits at any stage, Radar stops spending immediately and shows the closest fully worked example under a “Live search is resting” banner — with the honest steps that ran still in the pipeline log. The example is labelled as a sample everywhere, and everything else on the site keeps working.</li>
        </ul>
        <p>
          The daily counter and cache live in server memory, so on serverless hosting they are
          per-instance and best-effort; the credits-error fallback is the hard backstop, because it
          reacts to TinyFish itself saying the wallet cannot pay.
        </p>
      </Section>

      <Section title="Steps 2–4 — Search, Fetch and Agent around TinySet">
        <p>
          <strong className="text-white">TinyFish Search</strong> (<code className={code}>GET api.search.tinyfish.ai</code>)
          runs four query angles derived from your description: recent raises by similar companies, seed/early
          rounds with named investors, “startups like …” coverage in your country, and funded-company lists.
          It also researches each candidate investor — cheque sizes, partners, application routes.
        </p>
        <p>
          <strong className="text-white">TinyFish Fetch</strong> (<code className={code}>POST api.fetch.tinyfish.ai</code>)
          reads the strongest articles and investor pages in full, so amounts, dates and investor names come
          from the page itself rather than a search snippet.
        </p>
        <p>
          <strong className="text-white">TinyFish Agent</strong> (<code className={code}>POST agent.tinyfish.ai/v1/automation/run</code>)
          is used narrowly: verifying the top-ranked investor's partner and contact route on their own website.
          Agent runs are metered, so this step is best-effort — if it times out, the card falls back to honest
          guidance instead of an invented name.
        </p>
        <p>
          All calls happen server-side. Your browser only talks to this app's own{" "}
          <code className={code}>POST /api/match</code> route; the API key
          (<code className={code}>TINYFISH_API_KEY</code>, sent as the <code className={code}>X-API-Key</code> header)
          never leaves the server.
        </p>
      </Section>

      <Section title="How the ranking is computed">
        <p>Every investor behind the comparable companies is scored out of 100, for your description specifically:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li><strong className="text-white">Comparable deals (up to +34)</strong> — how many similar companies they backed in the window; more proof, more points.</li>
          <li><strong className="text-white">Stage fit (+16–20)</strong> — they backed companies at your stage (seed, Series A, …).</li>
          <li><strong className="text-white">Sector overlap (up to +20)</strong> — the backed companies' descriptions genuinely overlap yours, keyword by keyword.</li>
          <li><strong className="text-white">Geography (+14)</strong> — they have backed companies in your country.</li>
          <li><strong className="text-white">Recency (+10)</strong> — they were active in the most recent part of the window.</li>
        </ul>
        <p>
          Each card shows its own factor breakdown (“How the score was computed”), so you can disagree with the
          ranking intelligently. Cheque sizes are either a firm's published range or an estimate derived from
          the rounds they joined in the dataset — the card always says which. Partner names appear only when a
          fetched page supports them.
        </p>
      </Section>

      <Section title="Honest limitations">
        <ul className="list-disc space-y-2 pl-5">
          <li>Only publicly announced rounds exist here. Stealth raises and unreported angel cheques are invisible to any web-based tool.</li>
          <li>Reported amounts are what publishers printed; they can be rounded, include debt, or be corrected later. Radar reflects coverage, not cap tables.</li>
          <li>Extraction is heuristic. A company whose raise was covered without a clear headline amount may be missed; the “few matches” banner appears when fewer than 10 comparables verify.</li>
          <li>Investor behaviour changes — partners move, funds finish deploying. Verify the partner and route on the firm's site before outreach; every card links you there.</li>
          <li>Demo mode: without an API key, Radar serves three fully worked sample results (Indian fintech, US AI devtools, Indian D2C skincare). They are labelled as samples everywhere they appear.</li>
        </ul>
      </Section>

      <Section title="Reuse the output">
        <p>
          Results export as JSON and CSV from the results page (investor shortlist and the comparable-companies
          dataset separately). The same data is available programmatically:{" "}
          <code className={code}>POST /api/match</code> with a description, stage and country returns the full
          structured result, and <code className={code}>GET /api/match?preset=indian-fintech</code> returns a
          complete sample — so a CRM, a spreadsheet workflow or another agent can consume Radar directly.
        </p>
      </Section>
    </div>
  );
}
