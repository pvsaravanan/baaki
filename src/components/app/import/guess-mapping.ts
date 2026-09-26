import type { ImportField } from "@/lib/csv";
import { FIELDS } from "./types";

/**
 * Score how well a header matches a field's hints. Unbounded substring matches
 * on tiny hints ("dr", "cr") produced false positives — "Address" contains
 * "dr", "Credit Limit" contains "cr" — so scoring prefers exact / whole-word
 * (token) matches and only allows a loose substring match for hints ≥4 chars.
 */
function headerScore(header: string, hints: string[]): number {
  const lower = header.toLowerCase().trim();
  const tokens = lower.split(/[^a-z0-9]+/).filter(Boolean);
  let best = 0;
  for (const hint of hints) {
    if (lower === hint) best = Math.max(best, 3);
    else if (tokens.includes(hint)) best = Math.max(best, 2);
    else if (hint.length >= 4 && lower.includes(hint)) best = Math.max(best, 1);
  }
  return best;
}

export function guessMapping(headers: string[]): Record<ImportField, string> {
  const mapping = Object.fromEntries(FIELDS.map((f) => [f.key, ""])) as Record<ImportField, string>;
  const used = new Set<string>();
  // FIELDS is ordered required-first, so required fields claim their best
  // header before optional ones can take it.
  for (const field of FIELDS) {
    let bestHeader = "";
    let bestScore = 0;
    for (const h of headers) {
      if (used.has(h)) continue;
      const score = headerScore(h, field.hints);
      if (score > bestScore) {
        bestScore = score;
        bestHeader = h;
      }
    }
    if (bestScore > 0) {
      mapping[field.key] = bestHeader;
      used.add(bestHeader);
    }
  }
  return mapping;
}

export function emptyMapping(): Record<ImportField, string> {
  return Object.fromEntries(FIELDS.map((f) => [f.key, ""])) as Record<ImportField, string>;
}
