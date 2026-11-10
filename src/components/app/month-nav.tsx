"use client";
import { useCallback, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, monthKeyOf, monthKeyString, monthLabel, parseMonthKey, type MonthKey } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { MonthPickerSheet } from "./date-picker-sheet";
import { useMonthScope } from "./month-scope";

// The floor budgetSchema and the budgets API enforce on `year`.
const EARLIEST_MONTH: MonthKey = { year: 2000, month: 1 };

/**
 * Prev / current / next month navigator that drives the `?m=YYYY-MM` param.
 * Inside a MonthScope, switching is a smooth transition (see month-scope).
 */
export function MonthNav({
  monthKey,
  isCurrent,
  className,
  monthsAhead = 0,
  rounded = false,
  pill = false,
  bar = false,
}: {
  monthKey: MonthKey;
  isCurrent: boolean;
  className?: string;
  /** How many months past this one can be opened (budgets look ahead; everything else stops at today). */
  monthsAhead?: number;
  /** Soft corners, for the dashboard. */
  rounded?: boolean;
  /** A single button showing the month, with no arrows: months are chosen from the sheet. */
  pill?: boolean;
  /** Compact and borderless, for the top bar (see TopbarSlot). */
  bar?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pickerOpen, setPickerOpen] = useState(false);
  const closePicker = useCallback(() => setPickerOpen(false), []);
  const scope = useMonthScope();

  // While a switch is in flight, show (and step from) the month being loaded,
  // so the label responds at once and quick repeated taps add up.
  const shown = (scope?.targetKey && parseMonthKey(scope.targetKey)) || monthKey;
  const latest = addMonths(monthKeyOf(new Date()), monthsAhead);
  const atLatest = shown.year === latest.year && shown.month === latest.month;

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

  const sheet = (
    <MonthPickerSheet
      open={pickerOpen}
      onClose={closePicker}
      value={shown}
      min={EARLIEST_MONTH}
      max={latest}
      onPick={go}
    />
  );

  if (bar) {
    return (
      <div className={cn("inline-flex items-center", className)}>
        <button
          type="button"
          onClick={() => go(addMonths(shown, -1))}
          className="flex h-10 w-9 shrink-0 items-center justify-center rounded-full text-fg transition-colors active:bg-surface-2"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={pickerOpen}
          aria-label={`Month: ${monthLabel(shown)}`}
          // Fixed width (the longest label is "September 2026") so the arrows
          // don't jump as the month changes.
          className="h-10 w-[8.75rem] shrink-0 whitespace-nowrap rounded-full text-center text-[15px] font-semibold text-fg transition-colors active:bg-surface-2"
        >
          {monthLabel(shown)}
        </button>
        <button
          type="button"
          onClick={() => go(addMonths(shown, 1))}
          disabled={atLatest}
          className="flex h-10 w-9 shrink-0 items-center justify-center rounded-full text-fg transition-colors active:bg-surface-2 disabled:opacity-25"
          aria-label="Next month"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
        {sheet}
      </div>
    );
  }

  if (pill) {
    return (
      <>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={pickerOpen}
          aria-label={`Month: ${monthLabel(shown)}`}
          className={cn("inline-flex h-11 items-center gap-2 rounded-full border border-border/40 bg-surface px-4 text-sm font-semibold text-fg transition-colors hover:bg-surface-2 active:bg-surface-2", className)}
        >
          <CalendarDays className="h-[18px] w-[18px] shrink-0" />
          <span className="whitespace-nowrap">{monthLabel(shown, { short: true })}</span>
          <ChevronDown className="h-4 w-4 shrink-0" />
        </button>
        {sheet}
      </>
    );
  }

  return (
    <div className={cn("relative inline-flex items-center justify-between gap-1 border border-border bg-surface", rounded ? "rounded-xl p-0.5" : "rounded-none p-1", className)}>
      <button
        onClick={() => go(addMonths(shown, -1))}
        className={cn("flex items-center justify-center rounded-none p-1.5 text-muted transition-colors hover:text-fg active:text-fg", rounded ? "h-8 w-8" : "h-9 w-9")}
        aria-label="Previous month"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        onClick={() => setPickerOpen((o) => !o)}
        // Fixed width, sized for the longest label ("September 2026"): a label
        // that resized with the month made the arrows — and the header — jump.
        className={cn("w-[9.5rem] shrink-0 whitespace-nowrap px-2 py-1 text-center text-sm font-medium text-fg transition-colors hover:bg-surface-2 active:bg-surface-2", rounded ? "rounded-lg" : "rounded-none")}
        aria-haspopup="true"
        aria-expanded={pickerOpen}
      >
        {monthLabel(shown)}
      </button>
      <button
        onClick={() => go(addMonths(shown, 1))}
        disabled={atLatest}
        className={cn("flex items-center justify-center rounded-none p-1.5 text-muted transition-colors hover:text-fg disabled:opacity-30 active:text-fg", rounded ? "h-8 w-8" : "h-9 w-9")}
        aria-label="Next month"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {sheet}
    </div>
  );
}
