import type { Frequency } from "./constants";

/** How many times a frequency comes round in an average month. */
const PER_MONTH: Record<Frequency, number> = {
  daily: 365 / 12,
  weekly: 52 / 12,
  monthly: 1,
  quarterly: 1 / 3,
  yearly: 1 / 12,
};

interface SummaryRule {
  type: "expense" | "income" | "transfer";
  amount: number;
  frequency: Frequency;
  interval: number;
  isActive: boolean;
  endDate: string | null;
}

/**
 * What the running rules bring in and take out in an average month, in paise.
 * A yearly bill counts as a twelfth, so rules of any frequency can be added up.
 * Paused and finished rules don't count, and a transfer is neither.
 */
export function expectedPerMonth(rules: SummaryRule[], today: string): { income: number; expense: number } {
  const total = (type: SummaryRule["type"]) =>
    Math.round(
      rules
        .filter((r) => r.type === type && r.isActive && !(r.endDate && r.endDate < today))
        .reduce((sum, r) => sum + (r.amount * PER_MONTH[r.frequency]) / Math.max(r.interval, 1), 0),
    );
  return { income: total("income"), expense: total("expense") };
}

export type RecurringSort = "next" | "amount" | "name";

export const RECURRING_SORTS: { value: RecurringSort; label: string }[] = [
  { value: "next", label: "Next occurrence" },
  { value: "amount", label: "Amount" },
  { value: "name", label: "Name" },
];

/** A sorted copy: soonest first, largest first, or A to Z. */
export function sortRules<R extends { name: string; amount: number; nextOccurrence: string }>(rules: R[], sort: RecurringSort): R[] {
  const compare: Record<RecurringSort, (a: R, b: R) => number> = {
    next: (a, b) => a.nextOccurrence.localeCompare(b.nextOccurrence),
    amount: (a, b) => b.amount - a.amount,
    name: (a, b) => a.name.localeCompare(b.name),
  };
  return [...rules].sort(compare[sort]);
}
