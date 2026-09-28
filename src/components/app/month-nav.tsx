"use client";
import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, monthKeyOf, monthKeyString, monthLabel, parseMonthKey, type MonthKey } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { MonthYearPicker } from "./month-year-picker";
import { useMonthScope } from "./month-scope";

/**
 * Prev / current / next month navigator that drives the `?m=YYYY-MM` param.
 * Inside a MonthScope, switching is a smooth transition (see month-scope).
 */
export function MonthNav({ monthKey, isCurrent, className }: { monthKey: MonthKey; isCurrent: boolean; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pickerOpen, setPickerOpen] = useState(false);
  const scope = useMonthScope();

  // While a switch is in flight, show (and step from) the month being loaded,
  // so the label responds at once and quick repeated taps add up.
  const shown = (scope?.targetKey && parseMonthKey(scope.targetKey)) || monthKey;
  const latest = monthKeyOf(new Date());
  const atLatest = scope ? shown.year === latest.year && shown.month === latest.month : isCurrent;

  const go = (key: MonthKey) => {
    const next = new URLSearchParams(params);
    const keyString = monthKeyString(key);
    next.set("m", keyString);
    const href = `${pathname}?${next.toString()}`;
    if (!scope) {
      router.push(href);
      return;
    }
    scope.navigate(href, keyString);
  };

  return (
    <div className={cn("relative inline-flex items-center justify-between gap-1 rounded-none border border-border bg-surface p-1", className)}>
      <button
        onClick={() => go(addMonths(shown, -1))}
        className="flex h-9 w-9 items-center justify-center rounded-none p-1.5 text-muted transition-colors hover:text-fg active:text-fg"
        aria-label="Previous month"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        onClick={() => setPickerOpen((o) => !o)}
        // Fixed width, sized for the longest label ("September 2026"): a label
        // that resized with the month made the arrows — and the header — jump.
        className="w-[9.5rem] shrink-0 whitespace-nowrap rounded-none px-2 py-1 text-center text-sm font-medium text-fg transition-colors hover:bg-surface-2 active:bg-surface-2"
        aria-haspopup="true"
        aria-expanded={pickerOpen}
      >
        {monthLabel(shown)}
      </button>
      <button
        onClick={() => go(addMonths(shown, 1))}
        disabled={atLatest}
        className="flex h-9 w-9 items-center justify-center rounded-none p-1.5 text-muted transition-colors hover:text-fg disabled:opacity-30 active:text-fg"
        aria-label="Next month"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      <MonthYearPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        value={shown}
        maxMonth={monthKeyOf(new Date())}
        onSelect={(key) => {
          go(key);
          setPickerOpen(false);
        }}
      />
    </div>
  );
}
