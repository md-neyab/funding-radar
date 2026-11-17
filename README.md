# Funding Radar

**Describe your startup in one line → get a ranked list of investors to approach, with proof for every match.**

Funding Radar finds companies like yours that raised in the last 12–18 months, works out who backed them,
and ranks those investors *for your startup* — your stage, your sector, your country. Every investor card
carries the similar companies they backed (round, amount, date, clickable proof), a typical cheque size,
the partner to approach, a realistic contact route, and a plain-language explanation of why they rank
where they do — including the score breakdown.

Built for the TinyFish **Funding Radar** bounty on TinyBounties.

## Screenshots

<!-- TODO (submission): add 2-3 screenshots — home form, a preset result's ranked list, the comparables table. -->

## Quick start

```bash
npm install
cp .env.example .env.local   # add your TinyFish API key (https://agent.tinyfish.ai/api-keys)
npm run dev                  # http://localhost:3000
```

Without a key the app runs in **demo mode**: three fully worked preset results (Indian fintech for SMBs,
US AI code-review tool, Indian D2C skincare brand) and honest demo states for custom descriptions.
With `TINYFISH_API_KEY` set, every description is researched live. The key is only ever used server-side
(sent as the `X-API-Key` header); it never reaches the browser.

## How it works — TinySet at the core, Search/Fetch/Agent around it

1. **TinySet (Datasets API)** — Radar creates a dataset through
   `POST https://agent.tinyfish.ai/v1/datasets` using a spec it defines: one row per comparable company
   with columns *company, what it does, country, round, amount (USD), date, investors, source URL*.
   The scope is written from the founder's description (similar startups, their market, rounds announced
   in the last 18 months). TinySet's agents build the dataset from the live web; rows stream in, Radar
   polls and reads them back via `GET /v1/datasets/{id}/rows`, and the dataset ID is recorded in the
   result (verifiable in the TinyFish dashboard). **Rows without a source URL are dropped — no proof, no match.**
   A TinySet build costs $0.10/row from the TinyFish wallet and typically takes 5–20 minutes; Radar
   requests **10 rows per search (≈ $1.00 of dataset cost per live run** — the brief's 10-comparable
   minimum), tops the set up with Search/Fetch, uses the rows that have landed inside a bounded
   window, and is explicit when a build is still running or failed — it never fakes a TinySet run.
2. **TinyFish Search** (`GET api.search.tinyfish.ai`) — four query angles derived from the description
   (recent raises by similar companies, early rounds with named investors, "startups like…" coverage,
   funded-company lists), plus research on each candidate investor.
3. **TinyFish Fetch** (`POST api.fetch.tinyfish.ai`) — the strongest articles and investor pages read in
   full, so amounts, dates and names come from pages, not snippets.
4. **TinyFish Agent** (`POST agent.tinyfish.ai/v1/automation/run`) — one narrow, best-effort job:
   verifying the #1 investor's partner and contact route on their own website. If it times out, the card
   says so and gives honest fallback guidance instead of an invented name.
5. **Ranking** — investors behind the comparables are aggregated and scored /100: comparable deals (≤34),
   stage fit (16–20), sector overlap with your description (≤20), geography (+14), recency (+10).
   Every card shows its factor breakdown.

Four TinyFish endpoints, each doing a job it is actually needed for.

## Wallet protection

Radar runs on a small prepaid TinyFish wallet, on a public site anyone can use. Four layers keep
that wallet safe — and keep the site from ever *looking* broken because of money:

1. **Cheaper runs** — the TinySet dataset requests 10 rows (the brief's minimum), ≈ **$1.00** of
   dataset cost per live run; Search/Fetch top the verified set up from there.
2. **Daily cap** — at most **8 live searches per UTC day** (server-side, in `lib/quota.ts`). The
   slot is reserved *before* a run starts, so slow, failed or parallel runs all count. On
   serverless hosting the counter is per-instance and best-effort (a cold start resets it) —
   combined with the cache and the credits fallback below, that is an accepted, documented
   trade-off. `GET /api/match` reports today's budget (`liveBudget`) when a key is configured.
3. **Result cache** — repeating the same (normalized) description + stage + country + sector is
   served from the in-memory cache with a pipeline-log step *"Served from cache — no TinyFish
   credits spent"*, and never counts against the cap. Completed live searches are listed on the
   homepage under **"Recent live searches — free to re-open"** (backed by `GET /api/recent`),
   so judges and founders can re-open real live results for free.
4. **Graceful fallback, never an error page** — when the daily cap is reached, *or* TinyFish
   returns a credits error (HTTP 402 / `INSUFFICIENT_CREDITS`) at any pipeline stage, Radar stops
   spending immediately and returns the closest worked example flagged `notice: "live-quota"`.
   The results page shows a friendly "Live search is resting" banner, the honest steps that ran
   (and what they spent) stay in the pipeline log, and the example is labelled as a sample
   everywhere. An empty wallet produces a calm explanation — never a broken-looking site.

**Test hooks (local verification only).** With `FUNDING_RADAR_ENABLE_TEST_HOOKS=1` set,
`FUNDING_RADAR_SIMULATE_QUOTA=cap` makes the daily cap behave as reached, and
`FUNDING_RADAR_SIMULATE_QUOTA=credits` makes a live run fail as if TinyFish returned
402 INSUFFICIENT_CREDITS — so the fallback can be verified without spending real credits.
The hooks are inert unless the enable flag is set; **never set either variable in production.**

## API & exports (output reusable by other tools)

- `POST /api/match` — body `{ description, stage, country, sector? }` (or `{ presetId }`) → the full
  structured result as JSON: comparables, ranked investors, sources, pipeline steps, TinySet provenance.
- `GET /api/match?preset=indian-fintech` — a complete sample result as JSON.
- `GET /api/match` — mode + preset catalogue (+ today's live-search budget in live mode).
- `GET /api/recent` — the last live searches (summaries only); re-opening one via `POST /api/match` is a free cache hit.
- Results page exports: **JSON**, **Investors CSV**, **Companies CSV**, copy-summary, print/PDF view.

## Pages

- `/` — founder form (description, stage, country, sector), 3 one-click demo presets, "Recent live searches" (server-side, free to re-open), how it works, per-browser recent searches
- `/results` — ranked investor list, comparable-companies table (expandable rows), TinySet/how-built panel, pipeline log, exports
- `/watchlist` — saved investors + recent searches (localStorage, no account)
- `/methodology` — TinySet's role, the ranking formula, and the tool's honest limitations

## Demo mode

No key → the three presets return complete sample results (11 comparables and 7 ranked investors each,
every row flagged as sample data under a demo banner). A custom description that closely matches a
preset's domain shows that preset with a clear "closest preset" notice; anything else gets an honest
"add a key for live research" state. Nothing in demo mode pretends to be live.

## Tech

Next.js 14 (App Router) · TypeScript · Tailwind CSS · no database (browser localStorage for
recents/saved/results) · server-only TinyFish integration in `lib/tinyfish.ts` + `lib/pipeline.ts`.

## Honest limitations

Only publicly announced rounds are visible; reported amounts are what publishers printed; extraction is
heuristic (a "partial result" banner appears when fewer than 10 comparables verify); cheque sizes are
labelled sourced vs estimated; partner names appear only when a fetched page supports them.
See `/methodology` in the app for the full version.
