/** What the Transactions page can filter on, as the sheet and list share it. */
import { addDays, addMonths, monthEndExclusive, monthKeyOf, monthStart, toISODate, type MonthKey } from "./dates";

export interface TransactionFilters {
  q: string;
  type: string;
  categoryId: string;
  accountId: string;
  start: string;
  end: string;
  min: string;
  max: string;
  tag: string;
  /** "1" when on, "" when off, like every other filter here. */
  hasNotes: string;
  recurring: string;
}

export const EMPTY_FILTERS: TransactionFilters = {
  q: "", type: "", categoryId: "", accountId: "", start: "", end: "", min: "", max: "", tag: "", hasNotes: "", recurring: "",
};

export interface DatePreset {
  label: string;
  start: string;
  end: string;
}

/** Whole calendar months; "Last 3 months" is this one and the two before it. */
export function datePresets(now: Date): DatePreset[] {
  const month = monthKeyOf(now);
  const previous = addMonths(month, -1);
  const lastDay = (key: typeof month) => toISODate(addDays(monthEndExclusive(key), -1));
  return [
    { label: "This month", start: toISODate(monthStart(month)), end: lastDay(month) },
    { label: "Last month", start: toISODate(monthStart(previous)), end: lastDay(previous) },
    { label: "Last 3 months", start: toISODate(monthStart(addMonths(month, -2))), end: lastDay(month) },
    { label: "Last 6 months", start: toISODate(monthStart(addMonths(month, -5))), end: lastDay(month) },
  ];
}

/** The dates covering one whole month. */
export function monthDates(key: MonthKey): Pick<TransactionFilters, "start" | "end"> {
  return { start: toISODate(monthStart(key)), end: toISODate(addDays(monthEndExclusive(key), -1)) };
}

/** The month the dates cover exactly, if they cover one whole month. */
export function wholeMonth(filters: Pick<TransactionFilters, "start" | "end">): MonthKey | null {
  const m = /^(\d{4})-(\d{2})-01$/.exec(filters.start);
  if (!m) return null;
  const key = { year: Number(m[1]), month: Number(m[2]) };
  return monthDates(key).end === filters.end ? key : null;
}

export function matchingPreset(filters: Pick<TransactionFilters, "start" | "end">, now: Date): DatePreset | undefined {
  return datePresets(now).find((p) => p.start === filters.start && p.end === filters.end);
}

/** A date range that isn't one of the presets or a chosen month, so it belongs to Advanced filters. */
export function hasCustomDates(filters: Pick<TransactionFilters, "start" | "end">, now: Date): boolean {
  return !!(filters.start || filters.end) && !matchingPreset(filters, now) && !wholeMonth(filters);
}

export function advancedFilterCount(filters: TransactionFilters, now: Date): number {
  return (
    [filters.min, filters.max, filters.tag, filters.hasNotes, filters.recurring].filter(Boolean).length +
    (hasCustomDates(filters, now) ? 1 : 0)
  );
}

/** Whether a category's kind is a sensible filter option for a transaction type. */
export function categoryKindMatches(kind: string, type: string): boolean {
  if (type === "transfer") return false; // transfers never carry a category
  if (type === "income") return kind === "income" || kind === "both";
  if (type === "expense") return kind === "expense" || kind === "both";
  return true; // "" = all types — no restriction
}

/** The first `limit` items, swapping in the selected one so it's never hidden. */
export function visibleWithSelected<T extends { id: string }>(items: T[], limit: number, selectedId: string): T[] {
  const shown = items.slice(0, limit);
  const selected = items.find((item) => item.id === selectedId);
  if (selected && !shown.includes(selected)) shown[shown.length - 1] = selected;
  return shown;
}
