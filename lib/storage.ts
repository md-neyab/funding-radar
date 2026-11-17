// Browser-side storage: recent searches, saved investors, last result.
// Everything lives in localStorage — no database, no account, no tracking.

import type { FounderInput, MatchResult } from "./types";

const RECENT_KEY = "fr:recent-searches";
const SAVED_KEY = "fr:saved-investors";
const LAST_KEY = "fr:last-result";

export interface RecentSearch {
  input: FounderInput;
  at: number;
  presetId?: string;
  topInvestor?: string;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked/full — app keeps working */
  }
}

export function getRecentSearches(): RecentSearch[] {
  return read<RecentSearch[]>(RECENT_KEY, []);
}

export function pushRecentSearch(input: FounderInput, presetId?: string, topInvestor?: string) {
  const key = (i: FounderInput) => `${i.description}|${i.stage}|${i.country}`.toLowerCase();
  const list = getRecentSearches().filter((r) => key(r.input) !== key(input));
  list.unshift({ input, at: Date.now(), presetId, topInvestor });
  write(RECENT_KEY, list.slice(0, 8));
}

export function getSavedInvestors(): string[] {
  return read<string[]>(SAVED_KEY, []);
}

export function isSavedInvestor(name: string): boolean {
  return getSavedInvestors().some((n) => n.toLowerCase() === name.toLowerCase());
}

export function toggleSavedInvestor(name: string): string[] {
  const list = getSavedInvestors();
  const next = isSavedInvestor(name) ? list.filter((n) => n.toLowerCase() !== name.toLowerCase()) : [name, ...list];
  write(SAVED_KEY, next.slice(0, 50));
  return next;
}

export function saveLastResult(r: MatchResult) {
  write(LAST_KEY, r);
}

export function getLastResult(): MatchResult | null {
  return read<MatchResult | null>(LAST_KEY, null);
}
