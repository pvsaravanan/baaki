"use client";
import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, monthKeyOf, monthKeyString, monthLabel, type MonthKey } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { MonthYearPicker } from "./month-year-picker";

/** Prev / current / next month navigator that drives the `?m=YYYY-MM` param. */
export function MonthNav({ monthKey, isCurrent, className }: { monthKey: MonthKey; isCurrent: boolean; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pickerOpen, setPickerOpen] = useState(false);

  const go = (key: MonthKey) => {
    const next = new URLSearchParams(params);
    next.set("m", monthKeyString(key));
    router.push(`${pathname}?${next.toString()}`);
  };

  return (
    <div className={cn("relative inline-flex items-center justify-between gap-1 rounded-none border border-border bg-surface p-1", className)}>
      <button
        onClick={() => go(addMonths(monthKey, -1))}
        className="flex h-9 w-9 items-center justify-center rounded-none p-1.5 text-muted transition-colors hover:text-fg active:text-fg"
        aria-label="Previous month"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        onClick={() => setPickerOpen((o) => !o)}
        className="min-w-[120px] rounded-none px-2 py-1 text-center text-sm font-medium text-fg transition-colors hover:bg-surface-2 active:bg-surface-2"
        aria-haspopup="true"
        aria-expanded={pickerOpen}
      >
        {monthLabel(monthKey)}
      </button>
      <button
        onClick={() => go(addMonths(monthKey, 1))}
        disabled={isCurrent}
        className="flex h-9 w-9 items-center justify-center rounded-none p-1.5 text-muted transition-colors hover:text-fg disabled:opacity-30 active:text-fg"
        aria-label="Next month"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      <MonthYearPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        value={monthKey}
        maxMonth={monthKeyOf(new Date())}
        onSelect={(key) => {
          go(key);
          setPickerOpen(false);
        }}
      />
    </div>
  );
}
