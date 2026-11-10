import { daysInMonth, monthKeyString, type MonthKey } from "./dates";

/** Calendar maths for the date picker. Dates are YYYY-MM-DD strings, which sort by date. */

export function isoDate({ year, month }: MonthKey, day: number): string {
  return `${monthKeyString({ year, month })}-${String(day).padStart(2, "0")}`;
}

export function monthKeyOfISO(iso: string): MonthKey {
  return { year: Number(iso.slice(0, 4)), month: Number(iso.slice(5, 7)) };
}

/** Empty cells before the 1st in a calendar whose weeks start on Sunday. */
export function leadingBlanks({ year, month }: MonthKey): number {
  return new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
}

/** Inclusive limits on what can be picked; either end may be open. */
export interface DateBounds {
  min?: string;
  max?: string;
}

/** The date itself, or the nearest one within the limits. */
export function clampDate(iso: string, { min, max }: DateBounds): string {
  if (min && iso < min) return min;
  if (max && iso > max) return max;
  return iso;
}

/** The same day in another month, or its last day if shorter; kept within the limits. */
export function moveToMonth(selected: string, key: MonthKey, bounds: DateBounds): string {
  const day = Math.min(Number(selected.slice(8, 10)), daysInMonth(key));
  return clampDate(isoDate(key, day), bounds);
}

/** The month itself, or the nearest one within the limits. */
export function clampMonth(key: MonthKey, { min, max }: DateBounds): MonthKey {
  const month = monthKeyString(key);
  if (min && month < min.slice(0, 7)) return monthKeyOfISO(min);
  if (max && month > max.slice(0, 7)) return monthKeyOfISO(max);
  return key;
}

/** First year of the twelve-year page shown around `year`. */
export function yearPageStart(year: number): number {
  return Math.floor(year / 12) * 12;
}
