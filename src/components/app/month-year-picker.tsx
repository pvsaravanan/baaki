"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { monthKeyOf, monthName, type MonthKey } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { AnchoredPopover, isInsidePopover } from "@/components/ui/anchored-popover";

/** Order-independent comparison: true if `a` is chronologically after `b`. */
function isAfter(a: MonthKey, b: MonthKey): boolean {
  return a.year * 12 + a.month > b.year * 12 + b.month;
}
function isBefore(a: MonthKey, b: MonthKey): boolean {
  return isAfter(b, a);
}

// Matches the floor budgetSchema/the budgets API already enforce on `year` —
// without a lower bound the year stepper can be clicked back indefinitely
// (there's nothing stopping a user from scrolling to, say, 1950). Callers
// that need a stricter floor (or none) pass `minMonth`/`maxMonth` instead.
const DEFAULT_MIN_MONTH: MonthKey = { year: 2000, month: 1 };

/**
 * Jump directly to any month — a year stepper above a 12-month grid — instead
 * of stepping one month at a time. Generic over direction: MonthNav uses it
 * to navigate financial periods (bounded to the past/present via `maxMonth`),
 * while a form field picking a future deadline (e.g. a savings goal's target
 * date) leaves `maxMonth` unset and bounds only the past via `minMonth`.
 *
 * Renders as a dropdown pinned to the trigger (not a full-screen
 * modal/bottom-sheet): the rest of the page stays visible and interactive
 * around it, closing on an outside click or Escape. The parent (the trigger's
 * wrapper) must be `position: relative` — see AnchoredPopover.
 */
export function MonthYearPicker({
  open,
  onClose,
  value,
  onSelect,
  onClear,
  minMonth = DEFAULT_MIN_MONTH,
  maxMonth,
  title = "Jump to month",
}: {
  open: boolean;
  onClose: () => void;
  /** null when nothing is selected yet (e.g. an optional date field). */
  value: MonthKey | null;
  onSelect: (key: MonthKey) => void;
  /** Shown as a "Clear" action next to Close when a value is set. Omit for a required field (MonthNav). */
  onClear?: () => void;
  minMonth?: MonthKey;
  maxMonth?: MonthKey;
  title?: string;
}) {
  const [viewYear, setViewYear] = useState(value?.year ?? monthKeyOf(new Date()).year);
  const panelRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<HTMLSpanElement>(null);

  // Re-open showing the currently selected month's year (or this year, if
  // nothing's selected yet), not wherever the picker was last left scrolled to.
  useEffect(() => {
    if (open) setViewYear(value?.year ?? monthKeyOf(new Date()).year);
  }, [open, value?.year]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      // A tap on the trigger toggles it (the caller's onClick), rather than closing and reopening.
      if (!isInsidePopover(e.target, panelRef.current, markerRef.current?.parentElement ?? null)) onClose();
    };
    // Captured, and stopped here: Escape (or Android's Back) closes just this
    // popup, not the form or sheet it sits in.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      onClose();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    // Full trigger width on phones; 20rem, right-aligned, from `sm` up.
    <AnchoredPopover ref={panelRef} markerRef={markerRef} open role="dialog" aria-label={title} width={{ sm: 320 }} preferredHeight={330}>
      <div className="flex items-center justify-between border-b border-border bg-brand-soft px-4 py-2.5">
        <span className="text-sm font-semibold text-fg">{title}</span>
        <div className="flex items-center gap-3">
          {onClear && value && (
            <button
              type="button"
              onClick={() => {
                onClear();
                onClose();
              }}
              className="text-label-sm uppercase text-brand-hover hover:underline"
            >
              Clear
            </button>
          )}
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted hover:text-fg">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setViewYear((y) => y - 1)}
            disabled={viewYear <= minMonth.year}
            className="flex h-9 w-9 items-center justify-center rounded-none text-muted transition-colors hover:text-fg disabled:opacity-30 active:text-fg"
            aria-label="Previous year"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="tnum text-base font-semibold text-fg">{viewYear}</span>
          <button
            type="button"
            onClick={() => setViewYear((y) => y + 1)}
            disabled={maxMonth !== undefined && viewYear >= maxMonth.year}
            className="flex h-9 w-9 items-center justify-center rounded-none text-muted transition-colors hover:text-fg disabled:opacity-30 active:text-fg"
            aria-label="Next year"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
            const key: MonthKey = { year: viewYear, month };
            const selected = value !== null && viewYear === value.year && month === value.month;
            const disabled = isBefore(key, minMonth) || (maxMonth !== undefined && isAfter(key, maxMonth));
            return (
              <button
                key={month}
                type="button"
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
    </AnchoredPopover>
  );
}
