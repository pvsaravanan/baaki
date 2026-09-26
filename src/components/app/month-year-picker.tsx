"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { monthKeyOf, monthName, type MonthKey } from "@/lib/dates";
import { cn } from "@/lib/cn";

/** Order-independent comparison: true if `a` is chronologically after `b`. */
function isAfter(a: MonthKey, b: MonthKey): boolean {
  return a.year * 12 + a.month > b.year * 12 + b.month;
}

// Matches the floor budgetSchema/the budgets API already enforce on `year` —
// without a lower bound the year stepper can be clicked back indefinitely
// (there's nothing stopping a user from scrolling to, say, 1950).
const MIN_YEAR = 2000;

/**
 * Jump directly to any month — a year stepper above a 12-month grid — instead
 * of clicking MonthNav's prev/next chevrons one month at a time.
 *
 * Renders as a dropdown anchored right under the trigger (not a full-screen
 * modal/bottom-sheet): the rest of the page stays visible and interactive
 * around it, closing on an outside click or Escape. The parent (MonthNav)
 * must be `position: relative` for the `absolute` positioning here to anchor
 * correctly.
 */
export function MonthYearPicker({
  open,
  onClose,
  value,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  value: MonthKey;
  onSelect: (key: MonthKey) => void;
}) {
  const nowKey = monthKeyOf(new Date());
  const [viewYear, setViewYear] = useState(value.year);
  const panelRef = useRef<HTMLDivElement>(null);

  // Re-open showing the currently selected month's year, not wherever the
  // picker was last left scrolled to.
  useEffect(() => {
    if (open) setViewYear(value.year);
  }, [open, value.year]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Jump to month"
      className={cn(
        "absolute left-0 right-0 top-full z-30 mt-1.5 w-full overflow-hidden",
        "rounded-none border-2 border-border bg-surface shadow-stamp-lg animate-scale-in",
        "sm:left-auto sm:right-0 sm:w-80",
      )}
    >
      <div className="flex items-center justify-between border-b border-border bg-brand-soft px-4 py-2.5">
        <span className="text-sm font-semibold text-fg">Jump to month</span>
        <button onClick={onClose} aria-label="Close" className="text-muted hover:text-fg">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setViewYear((y) => y - 1)}
            disabled={viewYear <= MIN_YEAR}
            className="flex h-9 w-9 items-center justify-center rounded-none text-muted transition-colors hover:bg-surface-2 hover:text-fg disabled:opacity-30 disabled:hover:bg-transparent active:bg-surface-2"
            aria-label="Previous year"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="tnum text-base font-semibold text-fg">{viewYear}</span>
          <button
            onClick={() => setViewYear((y) => y + 1)}
            disabled={viewYear >= nowKey.year}
            className="flex h-9 w-9 items-center justify-center rounded-none text-muted transition-colors hover:bg-surface-2 hover:text-fg disabled:opacity-30 disabled:hover:bg-transparent active:bg-surface-2"
            aria-label="Next year"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
            const key: MonthKey = { year: viewYear, month };
            const selected = viewYear === value.year && month === value.month;
            const disabled = isAfter(key, nowKey);
            return (
              <button
                key={month}
                onClick={() => onSelect(key)}
                disabled={disabled}
                aria-current={selected ? "date" : undefined}
                className={cn(
                  "rounded-none border p-2.5 text-sm font-medium uppercase transition-all active:translate-x-px active:translate-y-px active:shadow-none",
                  selected
                    ? "border-border bg-brand text-brand-fg shadow-stamp-sm"
                    : "border-border text-muted hover:bg-brand-soft hover:text-secondary",
                  disabled && "cursor-not-allowed opacity-30 hover:bg-transparent hover:text-muted",
                )}
              >
                {monthName(month, true)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
