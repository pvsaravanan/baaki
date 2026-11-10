import {
  categoryTotals,
  filterRange,
  percentChange,
  summarize,
  type CalcTxn,
} from "./calculations";
import {
  addMonths,
  addMonthsToDate,
  endOfDayExclusive,
  monthEndExclusive,
  monthKeyOf,
  monthLabel,
  monthName,
  monthRange,
  monthStart,
  type MonthKey,
} from "./dates";

export const REPORT_PERIODS = [
  { value: "this-month", label: "This Month" },
  { value: "last-month", label: "Last Month" },
  { value: "last-3-months", label: "Last 3 Months" },
  { value: "last-6-months", label: "Last 6 Months" },
  { value: "this-year", label: "This Year" },
] as const;
export type PresetPeriod = (typeof REPORT_PERIODS)[number]["value"];
/** A preset, one chosen month ("month-2026-03"), or a chosen span of months ("range-2026-01-2026-06"). */
export type ReportPeriod = PresetPeriod | `month-${string}` | `range-${string}`;

/** The longest span of months that can be chosen. */
export const MAX_RANGE_MONTHS = 24;

const pad = (month: number) => String(month).padStart(2, "0");
const keyText = (k: MonthKey) => `${k.year}-${pad(k.month)}`;
const order = (k: MonthKey) => k.year * 12 + k.month;

export function monthPeriod(key: MonthKey): ReportPeriod {
  return `month-${keyText(key)}`;
}

export function rangePeriod(from: MonthKey, to: MonthKey): ReportPeriod {
  return order(from) === order(to) ? monthPeriod(from) : `range-${keyText(from)}-${keyText(to)}`;
}

/** The months a chosen month or span covers, or null for a preset. */
export function chosenMonths(period: ReportPeriod): { from: MonthKey; to: MonthKey } | null {
  const one = /^month-(\d{4})-(\d{2})$/.exec(period);
  if (one) {
    const key = { year: Number(one[1]), month: Number(one[2]) };
    return { from: key, to: key };
  }
  const span = /^range-(\d{4})-(\d{2})-(\d{4})-(\d{2})$/.exec(period);
  if (span) return { from: { year: Number(span[1]), month: Number(span[2]) }, to: { year: Number(span[3]), month: Number(span[4]) } };
  return null;
}

export function parseReportPeriod(value: string | null | undefined, now = new Date()): ReportPeriod {
  const preset = REPORT_PERIODS.find((p) => p.value === value)?.value;
  if (preset || !value) return preset ?? "this-month";
  const chosen = chosenMonths(value as ReportPeriod);
  const valid = (k: MonthKey) => k.month >= 1 && k.month <= 12 && k.year >= 2000 && order(k) <= order(monthKeyOf(now));
  if (
    chosen &&
    valid(chosen.from) &&
    valid(chosen.to) &&
    order(chosen.from) <= order(chosen.to) &&
    order(chosen.to) - order(chosen.from) < MAX_RANGE_MONTHS
  ) {
    return rangePeriod(chosen.from, chosen.to);
  }
  return "this-month";
}

/** "Mar 2026", "Jan – Jun 2026" or "Nov 2025 – Feb 2026"; a preset's own label. */
export function periodLabel(period: ReportPeriod): string {
  const chosen = chosenMonths(period);
  if (!chosen) return REPORT_PERIODS.find((p) => p.value === period)?.label ?? "";
  const { from, to } = chosen;
  if (order(from) === order(to)) return monthLabel(from, { short: true });
  if (from.year === to.year) return `${monthName(from.month, true)} – ${monthLabel(to, { short: true })}`;
  return `${monthLabel(from, { short: true })} – ${monthLabel(to, { short: true })}`;
}

export interface PeriodRanges {
  start: Date;
  end: Date; // exclusive
  /** What the period is compared with. */
  previousStart: Date;
  previousEnd: Date; // exclusive
  /** Completes "12% lower than ...". */
  comparedWith: string;
  /** The months the period covers, oldest first. */
  months: MonthKey[];
}

/**
 * The dates a period covers and what it's fairly compared with: as many months
 * just before it. A period still in progress is compared only as far as it
 * has got: six days of this month against all of last month would always look
 * like a big drop.
 */
export function periodRanges(period: ReportPeriod, now: Date): PeriodRanges {
  const current = monthKeyOf(now);
  const monthsFrom = (first: MonthKey, count: number) => Array.from({ length: count }, (_, i) => addMonths(first, i));
  const sameDayAgo = (months: number) => endOfDayExclusive(addMonthsToDate(now, -months));

  const span = (first: MonthKey, count: number): PeriodRanges => {
    const last = addMonths(first, count - 1);
    const inProgress = order(last) === order(current);
    return {
      start: monthStart(first),
      end: monthEndExclusive(last),
      previousStart: monthStart(addMonths(first, -count)),
      previousEnd: inProgress ? sameDayAgo(count) : monthStart(first),
      comparedWith:
        count === 1
          ? inProgress
            ? "the same days last month"
            : "the month before"
          : `the ${count} months before`,
      months: monthsFrom(first, count),
    };
  };

  if (period === "this-year") {
    const first = { year: current.year, month: 1 };
    return {
      start: monthStart(first),
      end: monthEndExclusive(current),
      previousStart: monthStart({ year: current.year - 1, month: 1 }),
      previousEnd: sameDayAgo(12),
      comparedWith: "the same days last year",
      months: monthsFrom(first, current.month),
    };
  }
  if (period === "last-month") return span(addMonths(current, -1), 1);
  if (period === "last-3-months") return span(addMonths(current, -2), 3);
  if (period === "last-6-months") return span(addMonths(current, -5), 6);
  const chosen = chosenMonths(period);
  if (chosen) {
    // Nothing after this month has happened yet.
    const to = order(chosen.to) > order(current) ? current : chosen.to;
    const from = order(chosen.from) > order(to) ? to : chosen.from;
    return span(from, order(to) - order(from) + 1);
  }
  return span(current, 1);
}

export interface TrendPoint {
  label: string;
  value: number;
  inPeriod: boolean;
}

/** Spending per month, ending with the period's last month: at least six months, and all of the period. */
export function spendingTrend(txns: CalcTxn[], months: MonthKey[]): TrendPoint[] {
  const last = months[months.length - 1];
  const count = Math.max(6, months.length);
  return Array.from({ length: count }, (_, i) => {
    const key = addMonths(last, i - count + 1);
    const { start, end } = monthRange(key);
    return {
      label: monthName(key.month, true),
      value: summarize(filterRange(txns, start, end)).effectiveExpense,
      inPeriod: months.some((m) => m.year === key.year && m.month === key.month),
    };
  });
}

export interface Slice<R> {
  key: string;
  name: string;
  color: string;
  amount: number;
  /** Null for the "Others" slice. */
  row: R | null;
}

const OTHERS_COLOR = "#cfcac2";

/** The biggest categories, with the rest folded into "Others". One leftover category keeps its own name. */
export function categorySlices<R extends { categoryId: string | null; name: string; color: string; net: number }>(
  rows: R[],
  limit = 4,
): Slice<R>[] {
  const toSlice = (r: R): Slice<R> => ({ key: r.categoryId ?? "none", name: r.name, color: r.color, amount: r.net, row: r });
  if (rows.length <= limit + 1) return rows.map(toSlice);
  const others = rows.slice(limit).reduce((sum, r) => sum + r.net, 0);
  return [...rows.slice(0, limit).map(toSlice), { key: "others", name: "Others", color: OTHERS_COLOR, amount: others, row: null }];
}

/** "21%", or "<1%" for a share too small to round to anything but 0. */
export function shareLabel(amount: number, total: number): string {
  if (total <= 0) return "—";
  const percent = (amount / total) * 100;
  return percent > 0 && percent < 1 ? "<1%" : `${Math.round(percent)}%`;
}

/** A sentence about the biggest category, or null when nothing was spent. */
export function spendingInsight(
  top: { categoryId: string | null; name: string; net: number } | undefined,
  total: number,
  previousTxns: CalcTxn[],
  comparedWith: string,
): { categoryId: string | null; message: string } | null {
  if (!top || total <= 0) return null;
  const share = `You spent ${shareLabel(top.net, total)} on ${top.name}`;
  const before = categoryTotals(previousTxns).find((c) => c.categoryId === top.categoryId)?.net ?? 0;
  const change = percentChange(top.net, before);
  if (change === null) return { categoryId: top.categoryId, message: `${share}.` };
  const size = Math.round(Math.abs(change));
  const comparison = size === 0 ? `in line with ${comparedWith}` : `${size}% ${change > 0 ? "higher" : "lower"} than ${comparedWith}`;
  return { categoryId: top.categoryId, message: `${share}, ${comparison}.` };
}
