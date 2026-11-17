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
investors, source_url) scoped from the founder's description, `target_rows: 10` (lowered from 15 in
pass 4 — wallet protection). It then polls status
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

## Live-QA fixes (pass 3 — 17 Nov 2026, after first deployed review)

**Issue 1 — proof links pointed at publisher homepages (fixed).** Every comparable in all 3 presets
now links to the specific article reporting its round. All 33 URLs were found via search and
fetch-verified on 17 Nov 2026 (page loads + covers that company's raise). Source mix: news articles
(TechCrunch ×3, Moneycontrol ×3, Entrackr ×3, Entrepreneur India ×4, Inc42 ×2, SiliconANGLE ×2,
IPO Central, VCCircle, The Hindu BusinessLine, YourStory, MLQ.ai, VieStories), investor/firm pages
(Lightspeed's Macroscope announcement, Vertex Ventures' Pilgrim story, Saama Capital's Mokobara
post), a Globe Newswire press release (Cline), a company newsroom page (CodeRabbit), an Inc42
article syndicated on NewsPoint (Dhan), and 2 funding-database profiles where no verbatim article
URL could be verified (Cursor via LeadWave, Bito via KingsCrowd).

Row facts corrected to match the linked articles:
- Fintech: Easebuzz $30M → $28M (₹240 Cr total round); Snapmint's lead was **General Atlantic**,
  not General Catalyst, and the round is a Series B — investor card #6 renamed accordingly
  (partner: Shantanu Rastogi, MD & Head of India); Dhan "Growth Round" → Series B; Skydo was a
  $10M Series A (Dec 2025, led by Susquehanna Asia VC, Elevation participated), not a $5M seed;
  Xflow was $16.6M led by General Catalyst (Feb 2026), not $16M led by Lightspeed; Dodo Payments
  was a $1.1M pre-seed (Antler, 9Unicorns, Venture Catalysts), not $3.25M.
- Devtools: Qodo's recent round is a $70M Series B (Mar 2026, Qumra Capital), not the Sep 2024
  $40M Series A; CodeAnt AI raised a $2M seed (May 2025, YC + Uncorrelated), not $7M; Bito's recent
  round is a $5.7M seed extension (2025, Vela Partners) — no $12M "Eka Ventures" Series A exists;
  Continue raised $3M seed (Feb 2025, Heavybit), not undisclosed. Three rows were unsalvageable
  and replaced with verified comparables: Codegen → **Factory** ($50M Series B, Sep 2025),
  Sweep → **Cline** ($32M Seed + Series A, Jul 2025), Tembo → **Cursor/Anysphere** ($900M Series C,
  Jun 2025). YC and a16z cards rewritten to match their new backed sets (YC: CodeAnt only;
  a16z: Cursor).
- D2C: Foxtale round is a Series C with Z47 + Kae Capital also in; Deconstruct is a Series A
  (Jan 2025) with V3 Ventures also in; Pilgrim row now reflects the real Fireside/Vertex-led
  ₹75 Cr (~$9M) Series B extension (Sep 2024) — the larger Mar 2025 round did not include
  Fireside and would have left the #1 card proofless; The Whole Truth closed Feb 2025 (not Jan)
  with Peak XV + Sauce.vc also in; Mokobara's $12M Series B was Feb 2024 (not 2025), with
  Sauce VC + Saama Capital; Hyphen never raised a VC seed — its first round was a ₹30 Cr
  strategic investment by PEP Technologies (Jul 2023); ClayCo raised a $2M Series A from
  Unilever Ventures (Oct 2024), not an undisclosed seed; WishCare raised ₹20 Cr (~$2.4M) from
  Unilever Ventures (Nov 2023), not an undisclosed 2025 seed; Fae Beauty raised ₹17 Cr (~$2M)
  led by Spring Marketing Capital (Nov 2025), not angels-only; Beco's round is a $10M
  **pre-Series B** led by Tanglin (Aug 2024) — Info Edge Ventures was not in it. Gush Beauty had
  no verifiable institutional round at all → replaced by **RAS Luxury Skincare** ($5M Series A
  led by Unilever Ventures, Jan 2025). DSG card rewritten (Deconstruct only); Unilever Ventures
  card now counts 3 backed comps; Peak XV card now counts 2 (Mokobara + The Whole Truth).
- Honest-window note: with verified data, several preset rounds fall outside a strict 18-month
  window (2023–24 rows kept because they are the rounds that actually back the ranked investors).
  Demo copy/caveats updated from "2025 raises" to "2023–26 coverage" to match.

**Issue 2 — "Proof links" stat counted distinct publishers (fixed).** `components/ResultsView.tsx`
now counts `r.comps.length` (one proof link per comparable, all clickable) instead of
`r.sources.length` (URL-deduped, which showed 4 or 2).

**Methodology consistency check (no change needed).** The live-QA paraphrase ("Portfolio fit 40,
Stage fit 20…") appears nowhere in the repo. The methodology page, `lib/extract.ts`
(`rankInvestors`: comparable deals ≤34 via `min(34, n×14)`, stage fit +16/+20, sector overlap
≤20 via `min(20, overlap×4)`, geography +14, recency +10, score clamped to [5, 98]) and this plan
all agree. Page text left as-is.

**Verification:** `npm run build` passes; production-server integrity check — each preset: 11
comps, 11 unique article-level source URLs, 0 homepage links, every investor card backed by ≥1
comp with a proof URL, no orphan proof chips, scores strictly descending.

## Wallet protection (pass 4 — 17 Nov 2026, after Neyab's wallet-drain concern)

Neyab's point: once the key is live on the public site, anyone (including judges) can trigger
searches; if the $8 wallet drains, the site must not look broken. Implemented in a new server-side
module `lib/quota.ts` + pipeline/route changes:

1. **Cheaper run** — TinySet `target_rows` 15 → **10** (the brief's minimum), ≈ **$1.00** dataset
   cost per live run (was ≈ $1.50); Search/Fetch top-up unchanged. Copy updated in README,
   methodology page, `.env.example` and this plan.
2. **Daily live-search cap: 8/UTC day** — in-memory counter keyed by UTC date; the slot is
   reserved *before* the run starts (slow/failed/parallel runs count). Presets and cache hits
   never count. Code comments + README state the serverless caveat plainly: per-instance,
   best-effort — the credits-error fallback is the hard backstop.
3. **Result cache** — in-memory, keyed by normalized (description + stage + country + sector).
   A repeat returns the stored live result with a first pipeline step *"Served from cache — no
   TinyFish credits spent"* and does not consume a cap slot. `GET /api/match` now also reports
   `liveBudget` (cap/used/remaining) in live mode.
4. **Graceful quota fallback** — `MatchResult.notice: "live-quota"` + `quotaFallbackResult()` in
   the pipeline. Triggered when (a) the daily cap is reached, or (b) TinyFish returns a credits
   error (HTTP 402 / INSUFFICIENT_CREDITS detected via `isCreditsError`) at ANY stage — TinySet
   create (remaining steps skipped immediately), Search (mid-loop), or Fetch — preserving the
   honest steps that already ran/spent in front of the log, plus a switch step explaining why.
   The UI renders a sky "Live search is resting" banner (`QuotaBanner`, replacing the demo
   banner for these results), the worked example is the closest preset (keyword match, else
   country default), labelled as sample everywhere. No error page is ever produced for money.
5. **Recent live searches (user addition, same pass)** — completed genuine live runs are
   recorded in the same in-memory store (summaries only, deduped by cache key, max 12 kept).
   `GET /api/recent` returns the last 6. The homepage renders "Recent live searches — free to
   re-open, no credits spent" cards (section `#recent-live`) that re-POST the stored parameters
   and land on the cache hit. Presets/demo/fallbacks/cache hits are never recorded. Empty list
   (always in demo mode) renders nothing. The per-browser localStorage "Your recent searches"
   is untouched.

**Test hook (documented in README + `.env.example`):** quota logic is verifiable without real
credits only when `FUNDING_RADAR_ENABLE_TEST_HOOKS=1`; then `FUNDING_RADAR_SIMULATE_QUOTA=cap`
makes the cap behave as reached, `=credits` makes a live run fail as if TinySet returned
402 INSUFFICIENT_CREDITS. Inert otherwise; must never be set in production.

**Verification (production server, dummy key):** 12/12 API checks passed — preset intact; a
custom search took the live path and was recorded (budget 1 used / 7 remaining); `/api/recent`
listed it; the identical repeat was a cache hit with the cache step and consumed no slot;
`SIMULATE_QUOTA=cap` returned the worked example with `notice: "live-quota"`, honest log and
caveat, and recorded nothing; `SIMULATE_QUOTA=credits` returned the fallback with the simulated
TinySet failure step followed by the switch step. Server-side render of `ResultsView` with the
credits-fallback result confirmed: quota banner renders, generic demo banner suppressed, sample
labelling intact. `npm run build` passes.

## Mobile UX (pass 5 — 17 Nov 2026, from Neyab's phone screenshot of a results card)

Desktop is pixel-identical: every changed desktop value is restored via `sm:`/`md:` variants
(diff-reviewed class by class).

1. **Tighter mobile width** — page container (layout + nav + footer) `px-4` → `px-3` on mobile
   (`sm:px-6` untouched); results panels/cards `p-5` → `p-4 md:p-5`, `p-6` → `p-4 md:p-6`,
   stat cards `p-4` → `p-3 md:p-4`, card inner gap `gap-4` → `gap-3 md:gap-4`.
2. **Compact investor cards on mobile** — per-card `expandedCards` state. Collapsed (mobile
   only): rank chip, firm name, score, why clamped to 2 lines (`line-clamp-2 md:line-clamp-none`),
   a one-line "Typical cheque: …" (`md:hidden`), and a "Details ▾" button (`md:hidden`). The
   score breakdown, cheque/partner/reach grid and proof chips sit in a `hidden md:block`
   wrapper until expanded; on `md:` everything is always visible exactly as before and no
   Details button exists. Verified in the built CSS (`line-clamp-2`, `md:line-clamp-none`,
   `md:hidden` all generated) and in the SSR render check (wrapper classes + button present).
3. **No dead ends** — the results empty state (`no_matches`), the `/results` "no result yet"
   state, and the founder-form error box now all offer **"See a demo result"** (loads the
   Indian-fintech preset result) and **"Recent results"** (links to `/#recent-live`, the
   homepage recent-live-searches section; that section carries `id="recent-live"` +
   `scroll-mt-24`). The form's demo button reuses its existing preset runner.

**Verification:** `npm run build` passes; class-by-class diff review confirms every pre-existing
desktop (≥768px) class value is unchanged; SSR render check confirms the compact-card markup.

## Still open (needs Neyab / parent agent)

1. **Live key test** — no `TINYFISH_API_KEY` in this VM (by design). First live run should verify:
   TinySet dataset creation on Neyab's account (wallet $8 ≈ 80 rows max; Radar requests 10 rows ≈ $1.00
   since pass 4), the rows' column names match the spec, and the Agent verify step's response shape.
   Wallet protection (pass 4) is in place for this: 8 live searches/day cap + cache + quota fallback,
   so judges testing the live site cannot drain the wallet or hit a broken-looking page.
2. **Screenshots** for README + submission media (≤5 files allowed on the claim form).
3. **GitHub repo + deployment** — not done here (explicitly out of scope for this build task);
   submission needs a demo URL or repo link.
4. **LinkedIn + X posts** — required fields on the claim form; copy should lead with the demo video
   story: describe startup → TinySet dataset builds → ranked investors with proof.
5. **Deadline: 18 Nov 2026, 1:29 PM IST.** Claim already registered on Neyab's account.

## TinySet polling fix (pass 6 — 17 Nov 2026, after the first real live run)

**Problem (observed live, 17 Nov ~17:30 IST):** the first real live run (Recall-Notebook-style
description) created the TinySet dataset and was charged for it ($0.80 of the run's $0.848
total), but **0 rows landed inside the app's 75-second polling window**, so the pipeline fell
back to Search+Fetch top-up and returned only **4 comparable companies / 3 investors**
(#1 Accel, 62) — short of the brief's 10+ target. TinySet builds typically take 5–20 minutes;
75s was simply too short.

**Fix (lib/pipeline.ts only; route already exported `maxDuration = 300`):**
1. **Polling window 75s → up to ~240s** — poll every ~10s (`TINYSET_POLL_INTERVAL_MS`),
   stop early as soon as the target 10 rows have landed or the run reports ready.
2. **Search runs concurrently** — the poll promise starts immediately after dataset
   creation and is awaited after the Search phase, so the longer window costs no extra
   wall-clock. Search steps are collected separately and appended after the TinySet rows
   step, keeping the step log in pipeline order. A mid-Search credits error still returns
   the graceful quota fallback at once (the background poll never rejects, so abandoning
   it is safe).
3. **Hard run budgets** — polling stops by ~225s into the run (`RUN_POLL_DEADLINE_MS`);
   Fetch and Agent timeouts are computed from what remains under a ~285s soft cap
   (`RUN_SOFT_BUDGET_MS`), so the whole run always answers within `maxDuration = 300`
   with all fallbacks (Search+Fetch top-up, quota fallback, honest step log) intact.
   Dataset rows, when they land, remain the primary comparables in the merge (TinySet
   rows win over Search/Fetch extraction for the same company, as before).
4. **Unchanged:** demo mode, presets, result cache, the 8/day live cap, the quota
   fallback, and all UI. The 0-rows step note now honestly says "up to ~4 minutes".

**Verification:** `npm run build` passes; one authorised live verification run against the
production API after redeploy (new EdTech description, not a cache hit) — outcome recorded
in the pass-6 report to Neyab.
