# Funding Radar — Plan, QA log

## PIVOT NOTE (16 Nov 2026, late evening)

This project was first built against a one-line summary of the bounty ("given a startup, find its
funding news") as a single-company dossier tool. The **verified brief** from the Funding Radar detail
page on tinybounties.com is different, and the app was pivoted the same night:

> "Build a TinyFish tool that takes a one-line description of a startup, finds companies like it that
> raised in the last 12 to 18 months, works out who backed them, and returns a ranked list of investors
> to approach, with proof for every match."

The dossier UI was removed; the design system, stack, TinyFish client and extraction helpers were
reused. **Deadline: Tue 17 Nov 2026, 11:59 PM PT = Wed 18 Nov, 1:29 PM IST.** Points scale with
TinyFish endpoints used meaningfully (1 → 50, 2 → 100, 3 → 150, 4+ → 200). 4 builds were already
submitted by competitors at claim time, and the bounty was already claimed on Neyab's account
(claim registered; submission still needs: demo/GitHub link, notes ≤2000 chars, LinkedIn post link,
X post link, optional media ≤5 files).

## The corrected brief → how the app answers it

| # | Requirement | Implementation |
|---|---|---|
| 1 | Input = short startup description + stage + country | Home form: description textarea (10–600 chars), stage select, country select, optional sector |
| 2 | ≥10 similar companies that raised in last 12–18 months, live sources | TinySet dataset (spec below) + Search/Fetch top-up; every comp requires a source URL; partial-result banner if <10 verify |
| 3 | Ranked investor list: backed companies w/ links, cheque size, lead partner, contact route | Investor cards: proof chips (company · round · amount · date → source), cheque (sourced/estimated, labelled), partner (only when evidenced, else guidance), contact route + note |
| 4 | Ranking reasoning specific to the described startup | Transparent score: comparable deals ≤34, stage fit 16–20, sector keyword overlap ≤20, geography +14, recency +10; per-card "Why #N" + expandable factor breakdown |
| 5 | Demo on 3 different startups | Presets: Indian fintech for SMBs · US AI code-review tool · Indian D2C skincare — one click, full sample results (11 comps, 7 investors each), all rows flagged sample |
| 6 | Uses TinySet, with explanation (Search/Fetch/Agent around it) | See TinySet section below + in-app methodology page + pipeline log |
| + | Output reusable by other tools | `POST /api/match` (JSON), `GET /api/match?preset=…`, JSON + 2× CSV exports, copy summary, print view |

## TinySet — investigated from official docs (16 Nov 2026)

TinySet is TinyFish's dataset builder (launched 5 Nov 2026): describe a dataset in plain English →
agents build it from the live web → structured, source-backed rows. It has a **real REST API**
(docs.tinyfish.ai/datasets/reference):

- `POST https://agent.tinyfish.ai/v1/datasets` with `{ prompt }` or `{ spec }`, `target_rows` (1–250),
  `populate` — returns 202 when a run starts. Spec = name, description, ≤10 columns (one primary key),
  optional `keep_when`.
- `GET /v1/datasets/{id}` — status (`empty|populating|ready|failed|cancelled`), `row_count`, latest run.
- `GET /v1/datasets/{id}/rows?limit=` — rows keyed by column name.
- `GET /v1/datasets/{id}/runs/{run_id}/events` — SSE stream of rows as they land.
- Pricing: **$0.10 per row** from the wallet; typical build **5–20 min**; public web only; snapshot, not
  a live feed; errors include 402 INSUFFICIENT_CREDITS and 404 FEATURE_NOT_AVAILABLE.

**How Radar uses it (genuinely, no fakery):** the comparable-companies set *is* a TinySet dataset.
Radar sends a self-written 8-column spec (company key, what_it_does, country, round, amount_usd, date,
investors, source_url) scoped from the founder's description, `target_rows: 15`. It then polls status
for a bounded 75 s window and reads back landed rows (rows stream, so partial sets are usable).
The dataset ID + rows used are recorded in the result and shown in the "How this shortlist was built"
panel. If creation fails or no rows land in time, the step log says exactly that and Search+Fetch build
the same dataset shape — the founder still gets a result, and nobody claims a TinySet run that didn't
happen. Trade-off (documented in-app): founders won't wait 5–20 min, so the bounded window + top-up is
the honest engineering answer.

**Endpoint count for scoring: TinySet + Search + Fetch + Agent = 4 endpoints** (200-pt tier), each with
a real job: dataset build · discovery/investor research · full-text proof · #1-investor verification.

## Feature list (final)

- Home: founder form + validation guidance, 3 preset cards, how-it-works (TinySet-led), features,
  recent searches (localStorage)
- Results: summary stats, how-built panel (TinySet provenance + caveats), ranked investor cards
  (score ring, why-rank, factor breakdown, cheque, partner, contact, proof chips, save investor),
  comparable-companies table with expandable funding-facts rows, pipeline log, sources via proof links
- Exports: JSON, investors CSV, companies CSV, copy summary, print/PDF stylesheet
- API: `POST /api/match`, `GET /api/match` (index), `GET /api/match?preset=` — full JSON for other tools
- Saved page: saved investors + recent searches (localStorage)
- Methodology page: TinySet role, ranking formula, limitations, reuse
- States: loading skeletons + animated live-progress steps, demo states, partial-result banner,
  no-matches state (demo vs live copy), API error states, custom 404
- Demo mode (no key): 3 full presets; custom descriptions → closest-preset with clear notice, or
  honest no-match demo state

## User-perspective QA (pass 1 — as a first-time founder)

Walked: home → presets → results → exports → saved → methodology → error paths; API exercised with
curl + a data-integrity script (no browser available in this environment; verified via server-rendered
HTML and API responses).

| # | Finding | Fix |
|---|---|---|
| U1 | 404 page still described the OLD dossier product ("/company/Razorpay") after the pivot | Rewritten for the investor-matching product |
| U2 | Comparable-table rows expanded only on mouse click — keyboard users locked out | Rows are focusable buttons (Enter/Space), `aria-expanded` added |
| U3 | A founder can't tell a demo result from a live one at a glance | Demo banner + "Sample result" label + per-row sample flags retained from v1 design |
| U4 | Live runs can take ~2 min (TinySet window + searches); a bare spinner would feel broken | Animated step list naming each endpoint + "can take a minute or two" copy |
| U5 | Too-short or rambling descriptions produce garbage rankings | 10–600 char validation with guidance copy on both client and server |
| U6 | Results live in localStorage — a shared/refreshed link could confuse | /results empty state explains storage and routes back to the form; noted as known limitation |
| U7 | "Other" country + free-text sector could weaken geo matching | Country list covers major startup hubs; ranking degrades gracefully (geo factor simply scores 0) |
| U8 | Investor cards are long; scanning 10 needs landmarks | Rank badge, score ring, and the 3 detail tiles (cheque/partner/contact) are visually consistent per card |

Data-integrity script results (all presets): 11 comps each (≥10 ✓), 7 investors each, **every investor
has ≥1 backed company with a proof URL, every comp has a source URL, no backed-company references a
company missing from the table, scores strictly descending, ranks 1–7 sequential.** Error paths verified:
short description → 400 with guidance; unknown preset → 404; gibberish description in demo → honest
no-matches state; unknown page → custom 404.

## Judge-perspective QA (pass 2 — against the brief's approval criteria)

| Criterion | Verdict | Evidence |
|---|---|---|
| Every match backed by a live link | ✓ | Comps require source_url (TinySet rows without one are dropped in code); investor proof chips link out; integrity script confirms |
| Accuracy vs sources | ✓ (design) | Fetch-before-trust, amounts only from text, cheque estimates labelled, partners only when evidenced |
| Ranking specific to the described startup | ✓ | Score computed from the user's stage/sector/country/description keywords; factor breakdown shown per card; two different presets produce materially different rankings |
| Works for ANY description | ✓ live / honest demo | Live pipeline is fully generic (queries + TinySet scope derive from input); demo mode never fakes a live result |
| TinySet used + explained | ✓ | Real Datasets API integration (create/poll/read rows), dataset ID surfaced, methodology + README + pipeline log explain the design and its failure modes |
| Endpoints used meaningfully | 4 | TinySet, Search, Fetch, Agent — each with a distinct job; no padding endpoint |
| 3 demo startups | ✓ | Fintech (India), AI devtools (US), D2C skincare (India) — different markets, stages of investor types (VC/accelerator/strategic) |
| Reusable output | ✓ | POST/GET API + JSON + 2 CSV exports |
| Useful detail (cheque, partner, contact) | ✓ presets; ◐ live | Live partner names only when a fetched page supports them (honest fallback text otherwise) — accuracy over decoration |

Judge-gaps found & fixed during this pass:
- J1: v1 app had no TinySet at all → TinySet made the core dataset layer (above).
- J2: Brief's "lead partner" could tempt invented names → hard rule in code + copy: no name without
  evidence; presets label partner data as sample.
- J3: Points claim needs the endpoint story visible *in the product*, not just the README → pipeline
  log tags every step with its endpoint; how-built panel names all four.

## Build verification

- `npm run build` — passes (Next.js 14.2.18). Routes: `/`, `/results`, `/watchlist`, `/methodology`,
  `/api/match`, custom 404.
- Production server smoke test: all pages 200, unknown route 404, API index/preset/POST flows as above.

## Still open (needs Neyab / parent agent)

1. **Live key test** — no `TINYFISH_API_KEY` in this VM (by design). First live run should verify:
   TinySet dataset creation on Neyab's account (wallet $8 ≈ 80 rows max; Radar requests 15 rows ≈ $1.50),
   the rows' column names match the spec, and the Agent verify step's response shape.
2. **Screenshots** for README + submission media (≤5 files allowed on the claim form).
3. **GitHub repo + deployment** — not done here (explicitly out of scope for this build task);
   submission needs a demo URL or repo link.
4. **LinkedIn + X posts** — required fields on the claim form; copy should lead with the demo video
   story: describe startup → TinySet dataset builds → ranked investors with proof.
5. **Deadline: 18 Nov 2026, 1:29 PM IST.** Claim already registered on Neyab's account.
