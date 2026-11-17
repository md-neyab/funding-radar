// Demo presets — the three worked examples the brief requires.
// Each preset is a full sample MatchResult: 11 comparable companies that
// "raised recently" and a ranked investor list built from them.
// ALL data here is sample data (flagged `sample: true` on every row and
// shown under a Demo banner in the UI). Rounds are modelled on real,
// widely-reported 2025 raises, but founders must verify figures on the
// linked publishers before acting — the app says exactly that.

import type { ComparableCompany, FounderInput, MatchResult, RankedInvestor, SourceRef } from "./types";

export interface Preset {
  id: string;
  label: string;
  tagline: string;
  input: FounderInput;
  result: MatchResult;
}

const TC = { title: "Funding coverage — TechCrunch", url: "https://techcrunch.com", publisher: "TechCrunch" };
const ET = { title: "Startup funding coverage — The Economic Times", url: "https://economictimes.indiatimes.com", publisher: "The Economic Times" };
const INC = { title: "Funding coverage — Inc42", url: "https://inc42.com", publisher: "Inc42" };
const MINT = { title: "Startup coverage — Mint", url: "https://www.livemint.com", publisher: "Mint" };
const YS = { title: "Startup stories — YourStory", url: "https://yourstory.com", publisher: "YourStory" };

type RawComp = Omit<ComparableCompany, "fetched" | "sample" | "publisher"> & { src: typeof TC };

function comp(c: RawComp): ComparableCompany {
  return { ...c, publisher: c.src.publisher, fetched: true, sample: true };
}

function sourcesFrom(comps: ComparableCompany[]): SourceRef[] {
  const seen = new Map<string, SourceRef>();
  for (const c of comps) {
    if (!seen.has(c.sourceUrl)) seen.set(c.sourceUrl, { title: c.sourceTitle, url: c.sourceUrl, publisher: c.publisher, fetched: c.fetched, sample: true });
  }
  return [...seen.values()];
}

interface InvSpec {
  name: string;
  type: string;
  score: number;
  why: string;
  factors: string[];
  cheque: string;
  chequeNote: string;
  partner: string | null;
  partnerNote: string;
  contactLabel: string;
  contactUrl: string | null;
  contactNote: string;
}

function investor(rank: number, spec: InvSpec, comps: ComparableCompany[]): RankedInvestor {
  const backed = comps
    .filter((c) => c.investors.includes(spec.name))
    .map((c) => ({ company: c.name, round: c.round, amountLabel: c.amountLabel, dateLabel: c.dateLabel, proofUrl: c.sourceUrl }));
  return {
    rank,
    name: spec.name,
    type: spec.type,
    matchScore: spec.score,
    whyRank: spec.why,
    scoreFactors: spec.factors,
    backed,
    chequeLabel: spec.cheque,
    chequeNote: spec.chequeNote,
    leadPartner: spec.partner,
    partnerNote: spec.partnerNote,
    contactLabel: spec.contactLabel,
    contactUrl: spec.contactUrl,
    contactNote: spec.contactNote,
    sample: true,
  };
}

function baseResult(input: FounderInput, presetId: string, comps: ComparableCompany[], investors: RankedInvestor[]): MatchResult {
  return {
    input,
    mode: "demo",
    presetId,
    generatedAt: new Date().toISOString(),
    comps,
    investors,
    sources: sourcesFrom(comps),
    steps: [
      { id: "tinyset", label: "TinySet — comparable-companies dataset", detail: `Demo preset: this result mirrors a TinySet dataset of ${comps.length} companies that raised in the last 18 months, built from the live web. In live mode Radar creates this dataset through the TinySet API (POST /v1/datasets) and reads its rows back.`, status: "done", ms: 0, endpoint: "TinySet" },
      { id: "search", label: "TinyFish Search — discovery & investor research", detail: "Demo preset: in live mode, Search finds the funding announcements behind every row and researches each investor's cheque size, partners and contact route.", status: "done", ms: 0, endpoint: "Search" },
      { id: "fetch", label: "TinyFish Fetch — proof deepening", detail: "Demo preset: in live mode, Fetch reads the strongest articles and investor pages in full so amounts, dates and partners come from the page, not a snippet.", status: "done", ms: 0, endpoint: "Fetch" },
      { id: "rank", label: "Ranking — scored for this startup", detail: `Ranked ${investors.length} investors by stage fit, sector overlap, geography and recency — specific to the description above, not a generic league table.`, status: "done", ms: 0, endpoint: "Rank" },
    ],
    caveats: [
      "Demo preset: rounds and investor details are representative samples modelled on real, widely-reported 2025 raises. Verify every figure on the linked publisher before outreach.",
      "Cheque sizes marked “estimated” are inferred from the rounds the investor backed in this dataset — firms do not always publish their range.",
      "A high rank means “worth approaching first”, not a promise of a meeting or a term sheet.",
    ],
    tinyset: { attempted: false, datasetId: null, rowsUsed: comps.length, note: "Demo preset data mirrors the TinySet dataset schema Radar uses live: one row per comparable company, every row carrying its source URL." },
    status: "ok",
  };
}

// ---------------------------------------------------------------------------
// Preset 1 — Indian fintech (SMB payments), Seed, India
// ---------------------------------------------------------------------------
function presetFintechIndia(): Preset {
  const input: FounderInput = {
    description: "Payments and expense-management app for small businesses in India — UPI collections, payouts and automated bookkeeping for SMBs that today juggle three apps and a spreadsheet.",
    stage: "Seed",
    country: "India",
    sector: "Fintech · SMB Payments",
  };
  const comps = [
    comp({ name: "Scapia", whatItDoes: "Travel-focused credit card and app for Indian consumers", country: "India", round: "Series B", amountUSD: 40_000_000, amountLabel: "$40M", dateLabel: "April 2025", dateSort: 202504, investors: ["Peak XV Partners", "Elevation Capital"], sourceUrl: ET.url, sourceTitle: ET.title, src: ET }),
    comp({ name: "Easebuzz", whatItDoes: "Payment platform and APIs for Indian SMEs and institutions", country: "India", round: "Series A", amountUSD: 30_000_000, amountLabel: "$30M", dateLabel: "April 2025", dateSort: 202504, investors: ["Bessemer Venture Partners"], sourceUrl: INC.url, sourceTitle: INC.title, src: INC }),
    comp({ name: "Stable Money", whatItDoes: "Fixed-income investment app (FDs and bonds) for retail savers", country: "India", round: "Series B", amountUSD: 20_000_000, amountLabel: "$20M", dateLabel: "June 2025", dateSort: 202506, investors: ["Fundamentum", "Matrix Partners India (Z47)"], sourceUrl: MINT.url, sourceTitle: MINT.title, src: MINT }),
    comp({ name: "Cashfree Payments", whatItDoes: "Payment gateway and payouts infrastructure for online businesses", country: "India", round: "Series C", amountUSD: 53_000_000, amountLabel: "$53M", dateLabel: "February 2025", dateSort: 202502, investors: ["KRAFTON India", "Apis Partners"], sourceUrl: ET.url, sourceTitle: ET.title, src: ET }),
    comp({ name: "Zolve", whatItDoes: "Cross-border neobank for immigrants moving to the US", country: "India / US", round: "Series B", amountUSD: 51_000_000, amountLabel: "$51M equity", dateLabel: "March 2025", dateSort: 202503, investors: ["Creaegis"], sourceUrl: INC.url, sourceTitle: INC.title, src: INC }),
    comp({ name: "Snapmint", whatItDoes: "No-cost EMI and pay-later checkout for online shoppers", country: "India", round: "Growth Round", amountUSD: 125_000_000, amountLabel: "$125M", dateLabel: "October 2025", dateSort: 202510, investors: ["General Catalyst"], sourceUrl: ET.url, sourceTitle: ET.title, src: ET }),
    comp({ name: "Dhan", whatItDoes: "Stock-trading and investing app for Indian retail traders", country: "India", round: "Growth Round", amountUSD: 120_000_000, amountLabel: "$120M", dateLabel: "October 2025", dateSort: 202510, investors: ["Hornbill Capital", "MUFG Bank"], sourceUrl: MINT.url, sourceTitle: MINT.title, src: MINT }),
    comp({ name: "TransBnk", whatItDoes: "Transaction-banking platform connecting banks, corporates and fintechs", country: "India", round: "Series B", amountUSD: 25_000_000, amountLabel: "$25M", dateLabel: "August 2025", dateSort: 202508, investors: ["Bessemer Venture Partners", "Arkam Ventures"], sourceUrl: INC.url, sourceTitle: INC.title, src: INC }),
    comp({ name: "Skydo", whatItDoes: "Cross-border payment collections for Indian exporters and freelancers", country: "India", round: "Seed", amountUSD: 5_000_000, amountLabel: "$5M", dateLabel: "August 2025", dateSort: 202508, investors: ["Elevation Capital"], sourceUrl: YS.url, sourceTitle: YS.title, src: YS }),
    comp({ name: "Xflow", whatItDoes: "International payments platform for SMBs and freelancers", country: "India", round: "Series A", amountUSD: 16_000_000, amountLabel: "$16M", dateLabel: "2025", dateSort: 202501, investors: ["Lightspeed India"], sourceUrl: INC.url, sourceTitle: INC.title, src: INC }),
    comp({ name: "Dodo Payments", whatItDoes: "Payments and billing for digital products and SaaS sold globally", country: "India", round: "Pre-Seed", amountUSD: 3_250_000, amountLabel: "$3.25M", dateLabel: "2025", dateSort: 202503, investors: ["Antler India"], sourceUrl: YS.url, sourceTitle: YS.title, src: YS }),
  ];
  const investors = [
    investor(1, { name: "Peak XV Partners", type: "VC", score: 92, why: "Backed Scapia's $40M round in 2025 and runs Surge, the most active seed programme for Indian fintech — your stage (Seed) and market (India SMB) sit exactly in their strike zone.", factors: ["Backed 1 comparable in the last 18 months", "Runs a dedicated seed programme (Surge)", "India-first fund with deep fintech portfolio", "Active in 2025 — most recent comparable round April 2025"], cheque: "$1M – $5M (seed / Surge)", chequeNote: "Published programme range for Surge; institutional seed cheques vary.", partner: "Shailendra Singh", partnerNote: "Managing Director; Surge cohorts are led by Rajan Anandan's team. Sample data — confirm the current fintech partner on their site.", contactLabel: "Apply via Surge / website", contactUrl: "https://www.peakxv.com", contactNote: "Surge applications open per cohort; a warm intro from a portfolio founder materially raises response rates." }, comps),
    investor(2, { name: "Elevation Capital", type: "VC", score: 89, why: "Two matches in your exact niche: Scapia (2025) and Skydo — an SMB cross-border payments seed, the closest comparable to your product in this dataset.", factors: ["Backed 2 comparables, including a Seed-stage payments company", "Seed-stage specialist in Indian fintech", "Most recent comparable round August 2025"], cheque: "$1M – $4M (seed)", chequeNote: "Estimated from the seed and early rounds they led in this dataset.", partner: "Mukul Arora", partnerNote: "Partner known for fintech and SaaS investments. Sample data — verify before outreach.", contactLabel: "Pitch via website", contactUrl: "https://www.elevationcapital.com", contactNote: "Elevation publishes a founder pitch route on its site; they respond to concise decks with clear market size." }, comps),
    investor(3, { name: "Bessemer Venture Partners", type: "VC", score: 84, why: "Led both Easebuzz (SME payments, Series A) and TransBnk (transaction banking) in 2025 — two of the closest B2B-payments comparables to your startup.", factors: ["Led 2 comparables in B2B payments in 2025", "Strong payments-infrastructure thesis (published roadmap)", "Writes larger cheques — best approached with Series A metrics or a priced seed"], cheque: "$2M – $10M (Series A focus)", chequeNote: "Estimated from rounds led in this dataset; Bessemer also does select seeds.", partner: "Vishal Gupta", partnerNote: "Partner, India fintech focus. Sample data — verify before outreach.", contactLabel: "Website / roadmap contact", contactUrl: "https://www.bvp.com", contactNote: "Bessemer publishes its fintech roadmap — referencing it in your outreach shows thesis fit." }, comps),
    investor(4, { name: "Matrix Partners India (Z47)", type: "VC", score: 78, why: "Co-invested in Stable Money's 2025 Series B and has a long Indian fintech track record from seed onward; a realistic seed target with local decision-making.", factors: ["Backed 1 comparable in 2025", "Seed-to-Series B continuity in India", "Fintech is a core sector for the fund"], cheque: "$500K – $5M", chequeNote: "Estimated from the fund's typical early-stage range in this market.", partner: "Avnish Bajaj", partnerNote: "Founder & Managing Director. Sample data — the fintech deal lead may differ; check the Z47 team page.", contactLabel: "Pitch via website", contactUrl: "https://www.z47.com", contactNote: "Z47 (formerly Matrix India) takes pitches through its site and partner office hours." }, comps),
    investor(5, { name: "Fundamentum", type: "VC", score: 72, why: "Co-led Stable Money's round — a consumer-fintech bet, but the fund backs Indian tech with patient capital and strong operator networks; a fit if your SMB product has a Bharat-scale story.", factors: ["Backed 1 comparable in 2025", "India-focused, long-horizon fund", "Less stage-pure: typically joins from Series A/B"], cheque: "$2M – $8M", chequeNote: "Estimated from rounds in this dataset.", partner: null, partnerNote: "Founded by Nandan Nilekani and Sanjeev Aggarwal; approach via the fund's contact route and reference the Stable Money thesis.", contactLabel: "Contact via website", contactUrl: "https://fundamentum.co.in", contactNote: "No public application form — a warm intro via a portfolio founder is the realistic route." }, comps),
    investor(6, { name: "General Catalyst", type: "VC", score: 66, why: "Led Snapmint's $125M round — proof of appetite for Indian consumer credit at scale, but GC's India cheques skew growth-stage; rank them as a Series A/B target, not your seed lead.", factors: ["Led the largest comparable round in this dataset ($125M)", "Stage mismatch for a seed raise — later-round fit", "Global fund; India decisions run through its India team"], cheque: "$5M – $25M (growth)", chequeNote: "Estimated from the round led in this dataset.", partner: null, partnerNote: "India practice is led from Bengaluru; identify the current fintech partner on their team page before writing.", contactLabel: "Website contact", contactUrl: "https://www.generalcatalyst.com", contactNote: "Best approached after a seed closes, with growth metrics in hand." }, comps),
    investor(7, { name: "KRAFTON India", type: "Strategic (CVC)", score: 58, why: "Led Cashfree's $53M round — a gaming giant writing fintech cheques in India. Strategic money can open distribution, but expect questions on synergy with their ecosystem.", factors: ["Led 1 large comparable (Cashfree, $53M)", "Strategic investor — synergy matters more than stage", "India-dedicated investment team"], cheque: "$5M – $20M (strategic)", chequeNote: "Estimated from the round led in this dataset.", partner: null, partnerNote: "Investments are run by KRAFTON India's corporate development team in Bengaluru.", contactLabel: "Corporate dev contact via website", contactUrl: "https://www.krafton.com", contactNote: "Frame the pitch around distribution or ecosystem synergy, not just returns." }, comps),
  ];
  return { id: "indian-fintech", label: "Indian fintech for SMBs", tagline: "Seed · India · Payments & bookkeeping for small businesses", input, result: baseResult(input, "indian-fintech", comps, investors) };
}

// ---------------------------------------------------------------------------
// Preset 2 — US AI developer tool, Seed, United States
// ---------------------------------------------------------------------------
function presetAiDevtool(): Preset {
  const input: FounderInput = {
    description: "AI code-review agent for engineering teams — automatically reviews pull requests, catches bugs and security issues before merge, and learns a team's conventions over time.",
    stage: "Seed",
    country: "United States",
    sector: "AI Developer Tools",
  };
  const comps = [
    comp({ name: "CodeRabbit", whatItDoes: "AI-powered code review platform for pull requests", country: "United States", round: "Series B", amountUSD: 60_000_000, amountLabel: "$60M", dateLabel: "September 2025", dateSort: 202509, investors: ["Scale Venture Partners", "NVentures"], sourceUrl: TC.url, sourceTitle: TC.title, src: TC }),
    comp({ name: "Greptile", whatItDoes: "AI code reviewer that understands whole codebases", country: "United States", round: "Series A", amountUSD: 25_000_000, amountLabel: "$25M", dateLabel: "September 2025", dateSort: 202509, investors: ["Benchmark"], sourceUrl: TC.url, sourceTitle: TC.title, src: TC }),
    comp({ name: "Graphite", whatItDoes: "Code review and stacked-PR platform for engineering teams", country: "United States", round: "Series B", amountUSD: 52_000_000, amountLabel: "$52M", dateLabel: "March 2025", dateSort: 202503, investors: ["Accel", "Anthropic (Anthology Fund)"], sourceUrl: TC.url, sourceTitle: TC.title, src: TC }),
    comp({ name: "Macroscope", whatItDoes: "AI system that reviews code and explains codebase changes", country: "United States", round: "Series A", amountUSD: 30_000_000, amountLabel: "$30M", dateLabel: "September 2025", dateSort: 202509, investors: ["Lightspeed Venture Partners"], sourceUrl: TC.url, sourceTitle: TC.title, src: TC }),
    comp({ name: "Qodo", whatItDoes: "Code-integrity platform with AI review and test generation", country: "United States / Israel", round: "Series A", amountUSD: 40_000_000, amountLabel: "$40M", dateLabel: "2025", dateSort: 202501, investors: ["Susa Ventures", "Square Peg"], sourceUrl: TC.url, sourceTitle: TC.title, src: TC }),
    comp({ name: "Codegen", whatItDoes: "AI coding agent that ships pull requests from tickets", country: "United States", round: "Series A", amountUSD: 60_000_000, amountLabel: "$60M", dateLabel: "2025", dateSort: 202506, investors: ["a16z"], sourceUrl: TC.url, sourceTitle: TC.title, src: TC }),
    comp({ name: "CodeAnt AI", whatItDoes: "AI code review and security scanning for development teams", country: "United States", round: "Seed", amountUSD: 7_000_000, amountLabel: "$7M", dateLabel: "October 2025", dateSort: 202510, investors: ["Y Combinator"], sourceUrl: YS.url, sourceTitle: YS.title, src: YS }),
    comp({ name: "Bito", whatItDoes: "AI coding assistant and code-review agent in the IDE", country: "United States", round: "Series A", amountUSD: 12_000_000, amountLabel: "$12M", dateLabel: "2025", dateSort: 202504, investors: ["Eka Ventures"], sourceUrl: TC.url, sourceTitle: TC.title, src: TC }),
    comp({ name: "Sweep", whatItDoes: "AI developer agent that turns issues into pull requests", country: "United States", round: "Seed", amountUSD: null, amountLabel: "Undisclosed", dateLabel: "2025", dateSort: 202502, investors: ["Y Combinator"], sourceUrl: YS.url, sourceTitle: YS.title, src: YS }),
    comp({ name: "Continue", whatItDoes: "Open-source AI coding assistant platform for teams", country: "United States", round: "Seed", amountUSD: null, amountLabel: "Undisclosed", dateLabel: "2025", dateSort: 202503, investors: ["Heavybit"], sourceUrl: TC.url, sourceTitle: TC.title, src: TC }),
    comp({ name: "Tembo", whatItDoes: "Managed Postgres platform with AI-assisted developer tooling", country: "United States", round: "Seed", amountUSD: null, amountLabel: "Undisclosed", dateLabel: "2025", dateSort: 202501, investors: ["Y Combinator"], sourceUrl: YS.url, sourceTitle: YS.title, src: YS }),
  ];
  const investors = [
    investor(1, { name: "Benchmark", type: "VC", score: 90, why: "Led Greptile's $25M Series A in September 2025 — the single closest comparable to your product (AI code review, US, post-seed). Benchmark concentrates on exactly this stage and category.", factors: ["Led the closest comparable in this dataset", "Devtools/AI infrastructure is a core Benchmark category", "Most recent comparable round September 2025"], cheque: "$1M – $10M (seed–Series A)", chequeNote: "Estimated from Benchmark's typical first cheques; the firm does not publish a range.", partner: "Eric Vishria", partnerNote: "Partner associated with Benchmark's devtools investments. Sample data — verify the current deal lead.", contactLabel: "Warm intro (no application form)", contactUrl: "https://www.benchmark.com", contactNote: "Benchmark famously takes no cold pitches via form — the realistic route is an intro from a founder or operator in their network." }, comps),
    investor(2, { name: "Scale Venture Partners", type: "VC", score: 85, why: "Led CodeRabbit's $60M Series B — the category leader's round. Scale's enterprise-software practice is the natural Series A/B home for a code-review agent with revenue.", factors: ["Led the category leader's 2025 round", "Enterprise software specialist", "Stage fit is Series A/B rather than seed"], cheque: "$5M – $30M (Series A/B)", chequeNote: "Estimated from rounds led in this dataset.", partner: null, partnerNote: "Scale's enterprise software team leads devtools deals; check the team page for the current partner covering AI infrastructure.", contactLabel: "Contact via website", contactUrl: "https://www.scalevp.com", contactNote: "Approach with ARR and enterprise pipeline metrics — Scale underwrites on revenue traction." }, comps),
    investor(3, { name: "Accel", type: "VC", score: 81, why: "Led Graphite's $52M Series B with Anthropic's fund alongside — Accel has backed devtools winners for two decades and is actively writing AI-devtools cheques in 2025.", factors: ["Led a top-3 comparable in March 2025", "Deep devtools portfolio and pattern recognition", "Seed through growth coverage"], cheque: "$1M – $15M (seed–Series A)", chequeNote: "Estimated from Accel's typical early-stage range.", partner: "Rich Wong", partnerNote: "Partner with a long enterprise/devtools record. Sample data — verify before outreach.", contactLabel: "Pitch via website", contactUrl: "https://www.accel.com", contactNote: "Accel takes direct pitches; lead with team background and early design-partner logos." }, comps),
    investor(4, { name: "Lightspeed Venture Partners", type: "VC", score: 77, why: "Led Macroscope's $30M Series A (September 2025) — another direct code-review comparable — and runs one of the largest AI practices in US venture.", factors: ["Led a direct comparable in September 2025", "Large dedicated AI practice", "Series A is their sweet spot for this category"], cheque: "$1M – $20M", chequeNote: "Estimated from rounds led in this dataset.", partner: null, partnerNote: "Identify the AI-infrastructure partner on Lightspeed's team page; the firm assigns sector leads per deal.", contactLabel: "Contact via website", contactUrl: "https://lsvp.com", contactNote: "A technical demo that shows review accuracy on real repos is the strongest opener for this firm." }, comps),
    investor(5, { name: "Y Combinator", type: "Accelerator", score: 74, why: "Three comparables in this dataset went through YC (CodeAnt AI, Sweep, Tembo). For a seed-stage US devtool, YC is the highest-probability first cheque and a signalling machine for the priced round after.", factors: ["Backed 3 comparables in this dataset", "Exact stage fit (pre-seed/seed)", "Standard, transparent deal — no negotiation games"], cheque: "$500K (standard deal)", chequeNote: "YC's standard deal is public: $500K total ($125K post-money SAFE + $375K MFN).", partner: null, partnerNote: "You are matched with group partners after acceptance; there is no single partner to pitch in advance.", contactLabel: "Apply online", contactUrl: "https://www.ycombinator.com/apply", contactNote: "Applications are batch-based and fully online — the demo video and founder-market-fit answers carry the application." }, comps),
    investor(6, { name: "a16z", type: "VC", score: 68, why: "Backed Codegen at Series A and runs Speedrun plus a large AI-infra practice. Powerful distribution and hiring network, but a16z seed cheques in devtools are selective — best with a technical edge story.", factors: ["Backed 1 adjacent comparable (coding agents)", "Speedrun programme covers pre-seed gaming/AI", "Huge platform team for GTM and hiring"], cheque: "$1M – $25M (varies by programme)", chequeNote: "Estimated; Speedrun and core fund cheques differ significantly.", partner: null, partnerNote: "a16z assigns partners by sector pod (AI infra); the website's team directory is the reliable route.", contactLabel: "Apply to Speedrun / website", contactUrl: "https://a16z.com", contactNote: "Speedrun applications are public; core-fund deals usually start with a warm intro." }, comps),
    investor(7, { name: "Anthropic (Anthology Fund)", type: "Strategic (CVC)", score: 60, why: "Co-invested in Graphite via the Anthology Fund (with Menlo). If your agent is built on Claude, this is a strategic cheque plus distribution — but it is an ecosystem fund, not a general seed vehicle.", factors: ["Backed 1 comparable (Graphite)", "Strategic fit only if you build on their models", "Smaller, programme-based cheques"], cheque: "$100K – $1M (programme)", chequeNote: "Estimated from the fund's published programme structure.", partner: null, partnerNote: "Run as a programme with Menlo Ventures; no single public deal partner.", contactLabel: "Programme page", contactUrl: "https://www.anthropic.com", contactNote: "Check the Anthology Fund page for cohort timing and eligibility (Claude-based products)." }, comps),
  ];
  return { id: "us-ai-devtool", label: "US AI code-review tool", tagline: "Seed · United States · AI developer tools", input, result: baseResult(input, "us-ai-devtool", comps, investors) };
}

// ---------------------------------------------------------------------------
// Preset 3 — Indian D2C skincare brand, Seed, India
// ---------------------------------------------------------------------------
function presetD2cSkincare(): Preset {
  const input: FounderInput = {
    description: "Clean, science-backed skincare brand selling online-first in India — serums and sunscreens formulated for Indian skin and climate, sold through our own website and marketplaces.",
    stage: "Seed",
    country: "India",
    sector: "D2C · Beauty & Personal Care",
  };
  const comps = [
    comp({ name: "Foxtale", whatItDoes: "D2C skincare brand for Indian skin concerns", country: "India", round: "Growth Round", amountUSD: 30_000_000, amountLabel: "$30M", dateLabel: "January 2025", dateSort: 202501, investors: ["KOSÉ Corporation", "Panthera Growth Partners"], sourceUrl: ET.url, sourceTitle: ET.title, src: ET }),
    comp({ name: "Deconstruct", whatItDoes: "Science-led skincare brand (serums, sunscreen) for beginners", country: "India", round: "Growth Round", amountUSD: 7_500_000, amountLabel: "₹65 Cr (~$7.5M)", dateLabel: "2025", dateSort: 202506, investors: ["L'Oréal BOLD", "DSG Consumer Partners"], sourceUrl: INC.url, sourceTitle: INC.title, src: INC }),
    comp({ name: "Pilgrim", whatItDoes: "D2C beauty and personal-care brand with global ingredient stories", country: "India", round: "Series B", amountUSD: 9_500_000, amountLabel: "$9.5M", dateLabel: "2025", dateSort: 202505, investors: ["Fireside Ventures", "Vertex Ventures"], sourceUrl: ET.url, sourceTitle: ET.title, src: ET }),
    comp({ name: "The Whole Truth", whatItDoes: "Clean-label packaged food brand (protein bars, peanut butter)", country: "India", round: "Series C", amountUSD: 15_000_000, amountLabel: "$15M", dateLabel: "January 2025", dateSort: 202501, investors: ["Sofina", "Z47 (Matrix India)"], sourceUrl: MINT.url, sourceTitle: MINT.title, src: MINT }),
    comp({ name: "Mokobara", whatItDoes: "D2C luggage and travel-goods brand", country: "India", round: "Series B", amountUSD: 12_000_000, amountLabel: "$12M", dateLabel: "2025", dateSort: 202504, investors: ["Peak XV Partners"], sourceUrl: INC.url, sourceTitle: INC.title, src: INC }),
    comp({ name: "Hyphen", whatItDoes: "Celebrity-backed skincare brand built for social commerce", country: "India", round: "Seed", amountUSD: 4_500_000, amountLabel: "₹40 Cr (~$4.5M)", dateLabel: "2025", dateSort: 202503, investors: ["Angel investors"], sourceUrl: YS.url, sourceTitle: YS.title, src: YS }),
    comp({ name: "ClayCo Cosmetics", whatItDoes: "Skincare brand built around global clay rituals", country: "India", round: "Seed", amountUSD: null, amountLabel: "Undisclosed", dateLabel: "2025", dateSort: 202502, investors: ["Unilever Ventures"], sourceUrl: INC.url, sourceTitle: INC.title, src: INC }),
    comp({ name: "WishCare", whatItDoes: "D2C haircare and skincare brand", country: "India", round: "Seed", amountUSD: null, amountLabel: "Undisclosed", dateLabel: "2025", dateSort: 202507, investors: ["Unilever Ventures"], sourceUrl: YS.url, sourceTitle: YS.title, src: YS }),
    comp({ name: "Gush Beauty", whatItDoes: "Clean, playful makeup brand for Gen-Z consumers", country: "India", round: "Seed", amountUSD: null, amountLabel: "Undisclosed", dateLabel: "2025", dateSort: 202508, investors: ["DSG Consumer Partners"], sourceUrl: INC.url, sourceTitle: INC.title, src: INC }),
    comp({ name: "Fae Beauty", whatItDoes: "Inclusive makeup brand built for Indian skin tones", country: "India", round: "Seed", amountUSD: null, amountLabel: "Undisclosed", dateLabel: "2025", dateSort: 202509, investors: ["Angel investors"], sourceUrl: YS.url, sourceTitle: YS.title, src: YS }),
    comp({ name: "Beco", whatItDoes: "Eco-friendly home-care and personal-care brand", country: "India", round: "Series B", amountUSD: 10_000_000, amountLabel: "$10M", dateLabel: "2025", dateSort: 202510, investors: ["Info Edge Ventures"], sourceUrl: ET.url, sourceTitle: ET.title, src: ET }),
  ];
  const investors = [
    investor(1, { name: "Fireside Ventures", type: "VC", score: 91, why: "India's best-known consumer-brand fund backed Pilgrim in this dataset and has built its entire practice around brands exactly like yours — D2C, India, seed-to-Series A.", factors: ["Backed a direct skincare comparable in 2025", "Consumer-brands-only fund — deepest pattern recognition for your category", "Seed is their entry stage"], cheque: "₹2 Cr – ₹10 Cr (seed)", chequeNote: "Estimated from the fund's typical first cheques in Indian consumer brands.", partner: "Kanwaljit Singh", partnerNote: "Founder & Managing Partner; consumer partners review brand deals. Sample data — verify before outreach.", contactLabel: "Pitch via website", contactUrl: "https://www.firesideventures.com", contactNote: "Fireside runs a structured pitch intake; lead with repeat-purchase rate and contribution margin, not just revenue." }, comps),
    investor(2, { name: "DSG Consumer Partners", type: "VC", score: 87, why: "Backed two comparables here (Deconstruct, Gush Beauty) and specialises in insurgent consumer brands across India and Southeast Asia — skincare is squarely in their portfolio pattern.", factors: ["Backed 2 comparables in this dataset", "Consumer-only thesis, India + SEA", "Active at seed and Series A"], cheque: "$1M – $5M", chequeNote: "Estimated from rounds backed in this dataset.", partner: "Deepak Shahdadpuri", partnerNote: "Founder & Managing Director. Sample data — verify before outreach.", contactLabel: "Contact via website", contactUrl: "https://www.dsgcp.com", contactNote: "DSG likes brands with a clear insurgent positioning versus incumbents — make the 'why us' unmissable." }, comps),
    investor(3, { name: "L'Oréal BOLD", type: "Strategic (CVC)", score: 76, why: "L'Oréal's venture arm backed Deconstruct — the closest 'science-led skincare' comparable. Strategic fit is real (formulation, distribution, credibility) but BOLD invests selectively and expects category leadership signals.", factors: ["Backed the closest science-led skincare comparable", "Strategic value beyond money: R&D and distribution", "Minority, growth-leaning cheques"], cheque: "$2M – $10M (strategic minority)", chequeNote: "Estimated from the round in this dataset.", partner: null, partnerNote: "BOLD deals are run by L'Oréal's corporate venture team; no single public partner for India skincare.", contactLabel: "BOLD programme page", contactUrl: "https://www.loreal.com/en/finance/bold/", contactNote: "Approach once you have hero-SKU traction; strategics move slower than VCs — start early, close in parallel." }, comps),
    investor(4, { name: "Peak XV Partners", type: "VC", score: 73, why: "Backed Mokobara and runs Surge, which has incubated Indian consumer brands; less category-pure than Fireside/DSG but the strongest seed platform in the country.", factors: ["Backed 1 D2C comparable in 2025", "Surge gives seed-stage structure and signalling", "Broad consumer portfolio beyond beauty"], cheque: "$1M – $5M (seed / Surge)", chequeNote: "Published programme range for Surge; institutional seed cheques vary.", partner: "Shailendra Singh", partnerNote: "Managing Director; Surge cohorts are led by Rajan Anandan's team. Sample data — confirm the consumer partner on their site.", contactLabel: "Apply via Surge / website", contactUrl: "https://www.peakxv.com", contactNote: "For consumer brands, Surge values early community and repeat cohorts — bring cohort data." }, comps),
    investor(5, { name: "Unilever Ventures", type: "Strategic (CVC)", score: 69, why: "Backed two early skincare/haircare comparables (ClayCo, WishCare) at seed — one of the few strategics that writes genuinely early cheques in beauty.", factors: ["Backed 2 seed-stage beauty comparables", "Rare strategic that invests at seed", "HUL distribution knowledge is a real asset in India"], cheque: "$500K – $3M (seed)", chequeNote: "Estimated from the seed rounds in this dataset.", partner: null, partnerNote: "Run by Unilever's ventures team; India beauty deals are typically partner-led from their global team.", contactLabel: "Ventures contact via website", contactUrl: "https://www.unileverventures.com", contactNote: "Frame around category creation and sustainability credentials, which the fund screens for." }, comps),
    investor(6, { name: "Sofina", type: "VC", score: 61, why: "Led The Whole Truth's Series C — a clean-label brand, thematically adjacent to 'clean skincare', but Sofina writes large growth cheques; a Series B/C target, not your seed lead.", factors: ["Led a clean-label comparable's growth round", "Stage mismatch for seed — later-round fit", "Strong consumer track record in India"], cheque: "$10M – $30M (growth)", chequeNote: "Estimated from the round led in this dataset.", partner: null, partnerNote: "Sofina's India consumer deals are led from its Asia team; identify via their portfolio page.", contactLabel: "Contact via website", contactUrl: "https://www.sofinagroup.com", contactNote: "Revisit after a seed + Series A with omnichannel scale." }, comps),
    investor(7, { name: "KOSÉ Corporation", type: "Strategic (CVC)", score: 57, why: "Led Foxtale's $30M round — a Japanese beauty major buying into Indian skincare growth. Strategic interest is proven, but cheques come with partnership expectations and longer timelines.", factors: ["Led a direct skincare comparable's round", "Strategic — expects commercial partnership angles", "Growth-stage cheque size"], cheque: "$5M – $20M (strategic)", chequeNote: "Estimated from the round led in this dataset.", partner: null, partnerNote: "Investments run through KOSÉ's corporate strategy team in Tokyo with local partners.", contactLabel: "Corporate contact via website", contactUrl: "https://www.kose.co.jp", contactNote: "Best approached with a distribution or co-development angle for Asian markets." }, comps),
  ];
  return { id: "india-d2c-skincare", label: "Indian D2C skincare brand", tagline: "Seed · India · Clean beauty, online-first", input, result: baseResult(input, "india-d2c-skincare", comps, investors) };
}

export const PRESETS: Preset[] = [presetFintechIndia(), presetAiDevtool(), presetD2cSkincare()];

export function getPreset(id: string): Preset | null {
  return PRESETS.find((p) => p.id === id) ?? null;
}
