"use client";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { monthKeyOf, monthKeyString, parseMonthKey } from "@/lib/dates";
import { setSelectedMonth, useSelectedMonth } from "@/lib/ui/selected-month";

/**
 * The month a screen shows: `?m=YYYY-MM` when the link has one, else the month
 * last chosen on any screen, else this month. A month in the link becomes the
 * chosen month, so every screen follows it. Screens using it must sit inside
 * <Suspense>, as useSearchParams requires.
 */
export function useMonthParam() {
  const param = useSearchParams().get("m");
  const selected = useSelectedMonth();
  const nowKey = monthKeyOf(new Date());
  const fromParam = parseMonthKey(param ?? undefined);
  const monthKey = fromParam ?? parseMonthKey(selected ?? undefined) ?? nowKey;
  const m = monthKeyString(monthKey);
  useEffect(() => {
    if (fromParam) setSelectedMonth(m);
  }, [fromParam, m]);
  return { m, monthKey };
}
