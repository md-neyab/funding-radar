// Funding Radar — corrected data model (investor matching, not company lookup).
//
// Flow: a founder describes their startup -> Radar builds a TinySet dataset
// of similar companies that raised in the last 12-18 months -> aggregates the
// investors behind those companies -> ranks the investors FOR THIS startup,
// with proof links for every match.

export interface FounderInput {
  description: string;
  stage: string; // Idea / Pre-seed / Seed / Series A / Series B+
  country: string;
  sector?: string;
}

export interface ComparableCompany {
  name: string;
  whatItDoes: string;
  country: string;
  round: string; // "Seed", "Series A", ...
  amountUSD: number | null;
  amountLabel: string;
  dateLabel: string;
  dateSort: number; // yyyymm
  investors: string[];
  sourceUrl: string; // proof link — required for a comp to count
  sourceTitle: string;
  publisher: string;
  fetched: boolean; // full text read via TinyFish Fetch
  sample?: boolean; // demo-mode sample row
}

export interface BackedProof {
  company: string;
  round: string;
  amountLabel: string;
  dateLabel: string;
  proofUrl: string;
}

export interface RankedInvestor {
  rank: number;
  name: string;
  type: string; // VC / Angel / Strategic / Family office / Accelerator
  matchScore: number; // 0-100, computed for THIS startup description
  whyRank: string; // specific reasoning, not a generic blurb
  scoreFactors: string[]; // transparent breakdown of the score
  backed: BackedProof[];
  chequeLabel: string; // "$500K – $2M"
  chequeNote: string; // sourced vs estimated — always labelled
  leadPartner: string | null;
  partnerNote: string;
  contactLabel: string; // "Apply via website", "Warm intro via portfolio founder", ...
  contactUrl: string | null;
  contactNote: string;
  sample?: boolean;
}

export interface SourceRef {
  title: string;
  url: string;
  publisher: string;
  fetched: boolean;
  sample?: boolean;
}

export interface PipelineStep {
  id: string;
  label: string;
  detail: string;
  status: "done" | "skipped" | "failed";
  ms: number;
  endpoint?: "TinySet" | "Search" | "Fetch" | "Agent" | "Rank";
}

export interface MatchResult {
  input: FounderInput;
  mode: "live" | "demo";
  presetId?: string;
  generatedAt: string;
  comps: ComparableCompany[];
  investors: RankedInvestor[];
  sources: SourceRef[];
  steps: PipelineStep[];
  caveats: string[];
  tinyset: {
    attempted: boolean;
    datasetId: string | null;
    rowsUsed: number;
    note: string;
  };
  status: "ok" | "few_matches" | "no_matches";
}

export interface MatchResponse {
  mode: "live" | "demo";
  result: MatchResult | null;
  demoHint?: string;
  error?: string;
}

export function formatUSD(n: number | null): string {
  if (n === null || !isFinite(n)) return "Undisclosed";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(n % 1_000_000_000 === 0 ? 0 : 2)}B`;
  if (n >= 1_000_000) return `$${Math.round(n / 1_000_000)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

/** The 18-month window the brief requires, relative to a run date. */
export function windowStart(now = new Date()): { label: string; sort: number } {
  const d = new Date(now);
  d.setMonth(d.getMonth() - 18);
  const sort = d.getFullYear() * 100 + (d.getMonth() + 1);
  const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  return { label, sort };
}
