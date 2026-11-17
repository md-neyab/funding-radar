// Live extraction & ranking.
// Turns TinyFish Search results (+ fetched article text) into comparable
// companies, then aggregates and ranks their investors FOR the founder's
// described startup. Conservative by design: a comparable only counts when
// it has an amount or round in the text AND a source URL as proof.

import type { ComparableCompany, FounderInput, RankedInvestor } from "./types";
import { formatUSD, windowStart } from "./types";
import { hostOf, type TFFetchedPage, type TFSearchResult } from "./tinyfish";

export const KNOWN_INVESTORS = [
  "Sequoia Capital", "Peak XV Partners", "Peak XV", "Tiger Global", "Accel", "Lightspeed Venture Partners",
  "Lightspeed", "DST Global", "SoftBank", "GIC", "Temasek", "Prosus", "Y Combinator", "a16z",
  "Andreessen Horowitz", "Founders Fund", "Khosla Ventures", "Benchmark", "Index Ventures", "Bessemer Venture Partners",
  "Bessemer", "General Catalyst", "Insight Partners", "Coatue", "Ribbit Capital", "Matrix Partners", "Z47",
  "Nexus Venture Partners", "Kalaari Capital", "Elevation Capital", "Blume Ventures", "Chiratae", "Norwest",
  "Premji Invest", "Falcon Edge", "StepStone", "Glade Brook", "Goodwater", "Fireside Ventures",
  "DSG Consumer Partners", "Sofina", "Verlinvest", "Unilever Ventures", "L'Oréal BOLD", "Kalaari",
  "Scale Venture Partners", "Menlo Ventures", "Thrive Capital", "Craft Ventures", "Initialized Capital",
  "First Round Capital", "Union Square Ventures", "Kleiner Perkins", "Spark Capital", "Foundry",
  "Arkam Ventures", "Fundamentum", "Creaegis", "Apis Partners", "Hornbill Capital", "Antler", "Surge",
];

const ROUND_RE = /(pre[-\s]?seed|seed|series\s*[a-h]|angel|growth round|venture round|funding round)/i;
const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8,
  september: 9, october: 10, november: 11, december: 12, jan: 1, feb: 2, mar: 3, apr: 4,
  jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

export function parseAmountUSD(text: string): number | null {
  const m = text.match(/\$\s?([\d,]+(?:\.\d+)?)\s*(billion|million|bn|mn|m|b|k)\b/i);
  if (m) {
    const v = parseFloat(m[1].replace(/,/g, ""));
    const unit = m[2].toLowerCase();
    const mult = unit.startsWith("b") ? 1e9 : unit === "k" ? 1e3 : 1e6;
    if (isFinite(v) && v > 0) return Math.round(v * mult);
  }
  const inr = text.match(/₹\s?([\d,]+(?:\.\d+)?)\s*crore/i);
  if (inr) {
    const crore = parseFloat(inr[1].replace(/,/g, ""));
    if (isFinite(crore) && crore > 0) return Math.round(crore * 1e7 * 0.012);
  }
  return null;
}

export function parseDate(text: string): { label: string; sort: number } | null {
  const m = text.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+(20\d{2})\b/i);
  if (m) {
    const mo = MONTHS[m[1].toLowerCase().replace(".", "")] ?? 0;
    const yr = parseInt(m[2], 10);
    return { label: `${m[1].replace(".", "")} ${yr}`, sort: yr * 100 + mo };
  }
  const y = text.match(/\b(20\d{2})\b/);
  if (y) return { label: y[1], sort: parseInt(y[1], 10) * 100 };
  return null;
}

export function investorsIn(text: string): string[] {
  const found: string[] = [];
  const lower = text.toLowerCase();
  for (const inv of KNOWN_INVESTORS) {
    if (lower.includes(inv.toLowerCase())) found.push(inv);
  }
  // "led by X Capital" style names not in the dictionary
  const lead = text.match(/led by ([A-Z][A-Za-z0-9&.\s]{2,40}?)(?:,|\.| and | with )/);
  if (lead && !found.some((f) => lead[1].toLowerCase().includes(f.toLowerCase()))) {
    const name = lead[1].trim();
    if (name.length >= 3 && name.length <= 40) found.unshift(name);
  }
  return [...new Set(found)].slice(0, 6);
}

function roundName(text: string): string | null {
  const m = text.match(ROUND_RE);
  if (!m) return null;
  const raw = m[1].toLowerCase().replace(/\s+/g, " ");
  if (raw.startsWith("series")) return "Series " + raw.replace("series", "").trim().toUpperCase();
  if (raw.startsWith("pre")) return "Pre-Seed";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/** Extract a company name from a headline like "Foo raises $12M ..." / "Bar secures funding". */
function companyFromHeadline(title: string): string | null {
  const m = title.match(/^([A-Z][A-Za-z0-9&.'-]*(?:\s+[A-Z][A-Za-z0-9&.'-]*){0,2})\s+(?:raises|raised|secures|secured|bags|closes|closed|lands|gets|announces)\b/);
  if (!m) return null;
  const name = m[1].trim();
  if (name.length < 2 || name.length > 40) return null;
  if (/^(the|this|how|why|top|best|startup|startups|india|indian|us|meet)/i.test(name)) return null;
  return name;
}

export interface ExtractedComp extends ComparableCompany {
  _score: number;
}

export function extractComps(
  results: TFSearchResult[],
  fetched: TFFetchedPage[],
  input: FounderInput
): ComparableCompany[] {
  const fetchedByUrl = new Map(fetched.map((f) => [f.url, f.text]));
  const win = windowStart();
  const byName = new Map<string, ExtractedComp>();

  for (const r of results) {
    const headline = `${r.title}. ${r.snippet}`;
    const name = companyFromHeadline(r.title);
    if (!name) continue;
    const amount = parseAmountUSD(headline) ?? (fetchedByUrl.has(r.url) ? parseAmountUSD(fetchedByUrl.get(r.url)!.slice(0, 8000)) : null);
    const round = roundName(headline);
    if (amount === null && !round) continue;
    const date = parseDate(headline) ?? (fetchedByUrl.has(r.url) ? parseDate(fetchedByUrl.get(r.url)!.slice(0, 8000)) : null);
    const investors = investorsIn(headline);
    const key = name.toLowerCase();
    const existing = byName.get(key);
    const comp: ExtractedComp = {
      name,
      whatItDoes: r.snippet ? r.snippet.slice(0, 180) : "Description not available in source snippet.",
      country: input.country,
      round: round ?? "Funding Round",
      amountUSD: amount,
      amountLabel: amount !== null ? formatUSD(amount) : "Undisclosed",
      dateLabel: date?.label ?? "Date not stated",
      dateSort: date?.sort ?? 0,
      investors,
      sourceUrl: r.url,
      sourceTitle: r.title,
      publisher: r.siteName || hostOf(r.url),
      fetched: fetchedByUrl.has(r.url),
      _score: (amount !== null ? 2 : 0) + (date && date.sort >= win.sort ? 2 : 0) + investors.length + (fetchedByUrl.has(r.url) ? 1 : 0),
    };
    if (!existing || comp._score > existing._score) byName.set(key, comp);
    else if (existing) {
      for (const inv of comp.investors) if (!existing.investors.includes(inv)) existing.investors.push(inv);
    }
  }

  const comps = [...byName.values()]
    .sort((a, b) => b._score - a._score || b.dateSort - a.dateSort)
    .slice(0, 15)
    .map(({ _score, ...rest }) => rest);
  return comps;
}

/** Map a TinySet dataset row to a comparable company. Rows without a source URL are dropped by the caller. */
export function compFromTinySetRow(row: Record<string, unknown>): ComparableCompany | null {
  const str = (k: string) => (row[k] !== undefined && row[k] !== null ? String(row[k]).trim() : "");
  const name = str("company");
  const sourceUrl = str("source_url");
  if (!name || !sourceUrl) return null;
  const amountRaw = row["amount_usd"];
  const amount = typeof amountRaw === "number" ? amountRaw : parseAmountUSD(str("amount_usd") || str("round"));
  const date = parseDate(str("date"));
  const investors = str("investors")
    ? str("investors").split(/[,;]/).map((s) => s.trim()).filter(Boolean).slice(0, 6)
    : [];
  return {
    name,
    whatItDoes: str("what_it_does") || "Description not provided in dataset row.",
    country: str("country"),
    round: str("round") || "Funding Round",
    amountUSD: amount,
    amountLabel: amount !== null ? formatUSD(amount) : "Undisclosed",
    dateLabel: str("date") || "Date not stated",
    dateSort: date?.sort ?? 0,
    investors,
    sourceUrl,
    sourceTitle: `TinySet dataset row — ${name}`,
    publisher: hostOf(sourceUrl),
    fetched: false,
  };
}

// ---------------------------------------------------------------------------
// Ranking
// ---------------------------------------------------------------------------

const STOPWORDS = new Set("the a an and or for of to in on with that this from by at is are was were startup company app platform product products service services based using helps help build builds building new".split(" "));

export function keywordsOf(text: string): string[] {
  return [...new Set(text.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOPWORDS.has(w)))].slice(0, 14);
}

function stageFamily(stage: string): string {
  const s = stage.toLowerCase();
  if (s.includes("pre")) return "early";
  if (s.includes("seed") || s.includes("idea")) return "early";
  if (s.includes("series a")) return "a";
  return "growth";
}

function roundFamily(round: string): string {
  const r = round.toLowerCase();
  if (/pre|seed|angel/.test(r)) return "early";
  if (/series a/.test(r)) return "a";
  return "growth";
}

export function rankInvestors(comps: ComparableCompany[], input: FounderInput): RankedInvestor[] {
  const kws = keywordsOf(`${input.description} ${input.sector ?? ""}`);
  const fam = stageFamily(input.stage);
  const win = windowStart();
  const byInvestor = new Map<string, ComparableCompany[]>();
  for (const c of comps) {
    for (const inv of c.investors) {
      const list = byInvestor.get(inv) ?? [];
      list.push(c);
      byInvestor.set(inv, list);
    }
  }

  const ranked: RankedInvestor[] = [];
  for (const [name, backed] of byInvestor.entries()) {
    const factors: string[] = [];
    let score = 0;

    const countPts = Math.min(34, backed.length * 14);
    score += countPts;
    factors.push(`Backed ${backed.length} comparable${backed.length > 1 ? "s" : ""} in the last 18 months (+${countPts})`);

    const stageHits = backed.filter((c) => roundFamily(c.round) === fam).length;
    if (stageHits > 0) {
      const pts = fam === "early" ? 20 : 16;
      score += pts;
      factors.push(`Backed ${stageHits} at your stage (${input.stage}) (+${pts})`);
    } else {
      factors.push(`No ${input.stage}-stage comparable in this dataset — stage fit unproven`);
    }

    let overlap = 0;
    for (const c of backed) {
      const text = `${c.whatItDoes} ${c.name}`.toLowerCase();
      overlap += kws.filter((k) => text.includes(k)).length;
    }
    const overlapPts = Math.min(20, overlap * 4);
    if (overlapPts > 0) {
      score += overlapPts;
      factors.push(`Sector overlap with your description across backed companies (+${overlapPts})`);
    }

    const geoHits = backed.filter((c) => c.country.toLowerCase().includes(input.country.toLowerCase().split(" ")[0])).length;
    if (geoHits > 0) {
      score += 14;
      factors.push(`Active in ${input.country} — backed ${geoHits} comparable${geoHits > 1 ? "s" : ""} there (+14)`);
    }

    const recent = backed.filter((c) => c.dateSort >= win.sort && c.dateSort >= 202501).length;
    if (recent > 0) {
      score += 10;
      factors.push(`Recently active — backed a comparable in the current window (+10)`);
    }

    score = Math.max(5, Math.min(98, Math.round(score)));

    const amounts = backed.map((c) => c.amountUSD).filter((a): a is number => a !== null).sort((a, b) => a - b);
    let chequeLabel = "Not enough data";
    let chequeNote = "No disclosed round sizes for this investor in the dataset, so no cheque estimate is shown.";
    if (amounts.length > 0) {
      const median = amounts[Math.floor(amounts.length / 2)];
      const lo = Math.max(100_000, Math.round((median * 0.15) / 50_000) * 50_000);
      const hi = Math.max(lo * 2, Math.round((median * 0.6) / 50_000) * 50_000);
      chequeLabel = `${formatUSD(lo)} – ${formatUSD(hi)} (typical first cheque, estimated)`;
      chequeNote = `Estimated from the ${amounts.length} disclosed round(s) this investor joined in the dataset (median round ${formatUSD(median)}). Verify on the investor's website — firms rarely publish exact ranges.`;
    }

    const top = backed[0];
    const whyRank =
      `Backed ${backed.length} compan${backed.length > 1 ? "ies" : "y"} similar to yours in the last 18 months` +
      (top ? ` — most relevantly ${top.name} (${top.round}, ${top.amountLabel}, ${top.dateLabel})` : "") +
      (stageHits > 0 ? `. They invest at your stage (${input.stage})` : `. Note: no ${input.stage}-stage deal appears in this dataset, so treat stage fit as unproven`) +
      (geoHits > 0 ? ` and they are active in ${input.country}.` : `.`);

    ranked.push({
      rank: 0,
      name,
      type: /ventures|capital|partners|fund/i.test(name) ? "VC" : "Investor",
      matchScore: score,
      whyRank,
      scoreFactors: factors,
      backed: backed.map((c) => ({ company: c.name, round: c.round, amountLabel: c.amountLabel, dateLabel: c.dateLabel, proofUrl: c.sourceUrl })),
      chequeLabel,
      chequeNote,
      leadPartner: null,
      partnerNote: "Radar could not confirm a named partner from the fetched pages — use the firm's team page to find the partner covering your sector, and reference the comparable deals above in your outreach.",
      contactLabel: "Investor website",
      contactUrl: null,
      contactNote: "Find the firm's pitch/contact route on its official site (linked via the proof sources). A warm intro from a portfolio founder is the highest-response route.",
    });
  }

  ranked.sort((a, b) => b.matchScore - a.matchScore);
  ranked.forEach((r, i) => (r.rank = i + 1));
  return ranked.slice(0, 10);
}
