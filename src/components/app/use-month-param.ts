"use client";
import { useSearchParams } from "next/navigation";
import { monthKeyOf, monthKeyString, parseMonthKey } from "@/lib/dates";

/**
 * The month a screen shows, from `?m=YYYY-MM` (default: this month). Screens
 * using it must sit inside <Suspense>, as useSearchParams requires.
 */
export function useMonthParam() {
  const param = useSearchParams().get("m");
  const nowKey = monthKeyOf(new Date());
  const monthKey = parseMonthKey(param ?? undefined) ?? nowKey;
  const isCurrent = monthKey.year === nowKey.year && monthKey.month === nowKey.month;
  return { m: monthKeyString(monthKey), monthKey, isCurrent };
}
