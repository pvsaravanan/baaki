/**
 * Date helpers. Financial periods ("today", "this month") are anchored to a
 * single fixed application timezone (IST, UTC+5:30, no DST) rather than the
 * server process's own timezone. A host like Vercel runs its Node process in
 * UTC — reading "today" via the process-local Date getters would then hand
 * an IST user the previous calendar day for the first 5.5 hours after
 * midnight IST, and make recurring rules come due late. Routing every
 * calendar computation through `zonedParts`/`fromZonedParts` below keeps the
 * app's notion of "today"/"this month" correct regardless of where the
 * server actually runs.
 *
 * A "month key" is { year, month(1-12) }. All range boundaries are
 * inclusive-start / exclusive-end.
 */

const APP_TZ_OFFSET_MINUTES = 330; // Asia/Kolkata, UTC+5:30, no DST

export interface MonthKey {
  year: number;
  month: number; // 1-12
}

export interface DateRange {
  start: Date; // inclusive
  end: Date; // exclusive
}

export interface ZonedParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
  ms: number;
}

/** Read a Date's calendar/time-of-day components as they fall in the app's fixed timezone. */
export function zonedParts(date: Date): ZonedParts {
  const shifted = new Date(date.getTime() + APP_TZ_OFFSET_MINUTES * 60_000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
    ms: shifted.getUTCMilliseconds(),
  };
}

/** Build a Date from calendar/time-of-day components interpreted in the app's fixed timezone. */
export function fromZonedParts(year: number, month: number, day: number, hour = 0, minute = 0, second = 0, ms = 0): Date {
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second, ms) - APP_TZ_OFFSET_MINUTES * 60_000);
}

/** Add whole days to a Date, preserving its time-of-day in the app timezone. */
export function addDays(date: Date, days: number): Date {
  const p = zonedParts(date);
  return fromZonedParts(p.year, p.month, p.day + days, p.hour, p.minute, p.second, p.ms);
}

export function monthKeyOf(date: Date): MonthKey {
  const { year, month } = zonedParts(date);
  return { year, month };
}

/** Start of the given month (00:00:00.000 in the app timezone). */
export function monthStart({ year, month }: MonthKey): Date {
  return fromZonedParts(year, month, 1);
}

/** Exclusive end of the given month == start of next month. */
export function monthEndExclusive({ year, month }: MonthKey): Date {
  return fromZonedParts(year, month + 1, 1);
}

export function monthRange(key: MonthKey): DateRange {
  return { start: monthStart(key), end: monthEndExclusive(key) };
}

export function addMonths(key: MonthKey, delta: number): MonthKey {
  const zeroBased = key.month - 1 + delta;
  const year = key.year + Math.floor(zeroBased / 12);
  const month = ((zeroBased % 12) + 12) % 12;
  return { year, month: month + 1 };
}

export function prevMonth(key: MonthKey): MonthKey {
  return addMonths(key, -1);
}

export function nextMonth(key: MonthKey): MonthKey {
  return addMonths(key, 1);
}

/** Number of days in a given month (handles leap years). Pure calendar math, timezone-independent. */
export function daysInMonth({ year, month }: MonthKey): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function monthLabel({ year, month }: MonthKey, opts: { short?: boolean } = {}): string {
  const name = MONTH_NAMES[month - 1];
  return `${opts.short ? name.slice(0, 3) : name} ${year}`;
}

export function monthName(month: number, short = false): string {
  const n = MONTH_NAMES[month - 1] ?? "";
  return short ? n.slice(0, 3) : n;
}

/** "2026-08" key string, useful as a stable identifier / URL param. */
export function monthKeyString({ year, month }: MonthKey): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function parseMonthKey(s: string | null | undefined): MonthKey | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{1,2})$/.exec(s);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

/** Format a Date as YYYY-MM-DD in the app timezone (for <input type=date> and CSV). */
export function toISODate(date: Date): string {
  const { year, month, day } = zonedParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Parse a YYYY-MM-DD string into a Date at midnight in the app timezone. Returns null if invalid. */
export function fromISODate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const d = fromZonedParts(year, month, day);
  const check = zonedParts(d);
  if (check.year !== year || check.month !== month || check.day !== day) return null;
  return d;
}

export function startOfDay(date: Date): Date {
  const { year, month, day } = zonedParts(date);
  return fromZonedParts(year, month, day);
}

export function endOfDayExclusive(date: Date): Date {
  return addDays(startOfDay(date), 1);
}

const DISPLAY_MONTHS = MONTH_NAMES.map((m) => m.slice(0, 3));

/** Human date like "11 Aug 2026", in the app timezone. */
export function formatDate(date: Date, opts: { withYear?: boolean } = {}): string {
  const { withYear = true } = opts;
  const { year, month, day } = zonedParts(date);
  const m = DISPLAY_MONTHS[month - 1];
  return withYear ? `${day} ${m} ${year}` : `${day} ${m}`;
}

/** Relative-ish label: Today / Yesterday / weekday / full date. */
export function formatRelativeDay(date: Date, now: Date): string {
  const a = startOfDay(date).getTime();
  const b = startOfDay(now).getTime();
  const diffDays = Math.round((b - a) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays === -1) return "Tomorrow";
  return formatDate(date, { withYear: zonedParts(date).year !== zonedParts(now).year });
}

/**
 * Advance a date by a recurrence frequency. Used to compute the next occurrence
 * of a recurring transaction. Keeps day-of-month stable where possible.
 */
export function advanceByFrequency(
  date: Date,
  frequency: "daily" | "weekly" | "monthly" | "quarterly" | "yearly",
  interval = 1,
): Date {
  switch (frequency) {
    case "daily":
      return addDays(date, interval);
    case "weekly":
      return addDays(date, 7 * interval);
    case "monthly":
      return addMonthsToDate(date, interval);
    case "quarterly":
      return addMonthsToDate(date, 3 * interval);
    case "yearly":
      return addMonthsToDate(date, 12 * interval);
  }
}

/** Add months to a Date, clamping the day to the target month's length. */
export function addMonthsToDate(date: Date, months: number): Date {
  const p = zonedParts(date);
  const targetMonthIndex = p.month - 1 + months;
  const targetYear = p.year + Math.floor(targetMonthIndex / 12);
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDay = daysInMonth({ year: targetYear, month: normalizedMonth + 1 });
  const day = Math.min(p.day, lastDay);
  return fromZonedParts(targetYear, normalizedMonth + 1, day, p.hour, p.minute, 0, 0);
}

/**
 * The nth occurrence (0-indexed; n=0 is `startDate` itself) of a recurrence
 * rule, computed directly from `startDate` rather than by repeatedly
 * advancing the previous occurrence.
 *
 * This matters for monthly/quarterly/yearly cadences: `addMonthsToDate`
 * clamps an out-of-range day (e.g. the 31st in February) to the target
 * month's last day. Chaining — advancing occurrence N+1 from the *clamped*
 * occurrence N — makes that clamp permanent: a "31st of every month" rule
 * would drift to the 28th after February and never recover. Anchoring every
 * occurrence back to the original `startDate` means the clamp only applies
 * to months that are actually too short, and the rule lands back on the
 * intended day (e.g. Mar 31, or Feb 29 on the next leap year) as soon as the
 * target month is long enough again.
 */
export function occurrenceAt(
  startDate: Date,
  frequency: "daily" | "weekly" | "monthly" | "quarterly" | "yearly",
  interval: number,
  n: number,
): Date {
  const start = startOfDay(startDate);
  switch (frequency) {
    case "daily":
      return addDays(start, interval * n);
    case "weekly":
      return addDays(start, interval * n * 7);
    case "monthly":
      return addMonthsToDate(start, interval * n);
    case "quarterly":
      return addMonthsToDate(start, interval * n * 3);
    case "yearly":
      return addMonthsToDate(start, interval * n * 12);
  }
}

/**
 * Smallest occurrence index n (>= 0) such that `occurrenceAt(startDate, ...,
 * n)` is at or after `target`. `occurrenceAt` is monotonically non-decreasing
 * in n, so this is a binary search after an exponential search for an upper
 * bound — correct and fast even for rules that are decades overdue.
 */
export function findOccurrenceIndex(
  startDate: Date,
  frequency: "daily" | "weekly" | "monthly" | "quarterly" | "yearly",
  interval: number,
  target: Date,
): number {
  const start = startOfDay(startDate);
  const targetTime = startOfDay(target).getTime();
  if (start.getTime() >= targetTime) return 0;

  let lo = 0;
  let hi = 1;
  while (occurrenceAt(start, frequency, interval, hi).getTime() < targetTime) {
    lo = hi;
    hi *= 2;
    if (hi > 1_000_000) break; // safety cap — matches the old 10k-iteration guard's intent
  }
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (occurrenceAt(start, frequency, interval, mid).getTime() < targetTime) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Inclusive count of days between two dates (by calendar day). */
export function daysBetween(from: Date, to: Date): number {
  const a = startOfDay(from).getTime();
  const b = startOfDay(to).getTime();
  return Math.round((b - a) / 86_400_000);
}
