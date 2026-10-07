"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { daysInMonth, fromISODate, monthKeyOf, monthLabel, nextMonth, prevMonth, type MonthKey } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { AnchoredPopover, isInsidePopover } from "@/components/ui/anchored-popover";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

/** Order-independent comparison: true if `a` is chronologically after `b`. */
function isAfter(a: MonthKey, b: MonthKey): boolean {
  return a.year * 12 + a.month > b.year * 12 + b.month;
}

// Same floor as MonthYearPicker / the budgets API's year validation.
const MIN_MONTH: MonthKey = { year: 2000, month: 1 };

function startMonthFor(value: string | null): MonthKey {
  return value ? monthKeyOf(fromISODate(value) ?? new Date()) : monthKeyOf(new Date());
}

/**
 * Pick a specific day — month navigation (prev/next) above a day-of-month
 * grid, in the same dropdown chrome as MonthYearPicker (anchored right below
 * the trigger, closes on outside click/Escape, optional Clear).
 *
 * Unlike MonthYearPicker (which only needs month granularity — financial
 * periods are always whole months), this is for fields that need an actual
 * calendar date, e.g. a savings goal's target date.
 */
export function DatePicker({
  open,
  onClose,
  value,
  onSelect,
  onClear,
  minDate,
  title = "Pick a date",
}: {
  open: boolean;
  onClose: () => void;
  /** ISO date (YYYY-MM-DD), or null when nothing's selected yet. */
  value: string | null;
  onSelect: (iso: string) => void;
  /** Shown as a "Clear" action next to Close when a value is set. */
  onClear?: () => void;
  /** ISO date floor (inclusive) — days before it are disabled. */
  minDate?: string;
  title?: string;
}) {
  const [viewMonth, setViewMonth] = useState<MonthKey>(() => startMonthFor(value));
  const panelRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<HTMLSpanElement>(null);

  // Re-open showing the selected date's month (or this month, if nothing's
  // selected yet), not wherever the picker was last left scrolled to.
  useEffect(() => {
    if (open) setViewMonth(startMonthFor(value));
  }, [open, value]);

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

  const monthPrefix = `${viewMonth.year}-${String(viewMonth.month).padStart(2, "0")}-`;
  const first = new Date(viewMonth.year, viewMonth.month - 1, 1).getDay(); // 0=Sun
  const count = daysInMonth(viewMonth);

  return (
    // Full trigger width on phones; 20rem, right-aligned, from `sm` up.
    <AnchoredPopover ref={panelRef} markerRef={markerRef} open role="dialog" aria-label={title} width={{ sm: 320 }} preferredHeight={400}>
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
            onClick={() => setViewMonth((m) => prevMonth(m))}
            disabled={!isAfter(viewMonth, MIN_MONTH)}
            className="flex h-9 w-9 items-center justify-center rounded-none text-muted transition-colors hover:text-fg disabled:opacity-30 active:text-fg"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold text-fg">{monthLabel(viewMonth)}</span>
          <button
            type="button"
            onClick={() => setViewMonth((m) => nextMonth(m))}
            className="flex h-9 w-9 items-center justify-center rounded-none text-muted transition-colors hover:text-fg active:text-fg"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-label-sm uppercase text-faint">
          {WEEKDAYS.map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: first }).map((_, i) => (
            <span key={`pad-${i}`} />
          ))}
          {Array.from({ length: count }).map((_, i) => {
            const day = i + 1;
            const iso = `${monthPrefix}${String(day).padStart(2, "0")}`;
            const selected = value === iso;
            const disabled = minDate !== undefined && iso < minDate;
            return (
              <button
                key={day}
                type="button"
                onClick={() => onSelect(iso)}
                disabled={disabled}
                aria-current={selected ? "date" : undefined}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-none border text-sm tabular-nums transition-all active:translate-x-px active:translate-y-px active:shadow-none",
                  selected
                    ? "border-border bg-brand text-brand-fg shadow-stamp-sm"
                    : "border-transparent text-fg hover:bg-brand-soft hover:text-secondary",
                  disabled && "cursor-not-allowed opacity-30 hover:bg-transparent hover:text-fg",
                )}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    </AnchoredPopover>
  );
}
