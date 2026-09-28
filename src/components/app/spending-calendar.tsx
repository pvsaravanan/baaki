"use client";
import React, { useEffect, useId, useRef, useState } from "react";
import { formatINR, formatINRCompact } from "@/lib/money";
import { daysInMonth, monthName, toISODate, type MonthKey } from "@/lib/dates";
import { cn } from "@/lib/cn";

/**
 * Calendar heatmap of daily spending. Intensity scales with each day's
 * effective expense relative to the busiest day in the month. Each day shows
 * its exact total in a small tooltip — on mouse hover, keyboard focus, or a
 * tap (which pins it until you tap elsewhere), so it works on touch screens
 * where there is no hover.
 */
export function SpendingCalendar({
  monthKey,
  daily,
}: {
  monthKey: MonthKey;
  daily: { date: string; expense: number }[];
}) {
  const monthPrefix = `${monthKey.year}-${String(monthKey.month).padStart(2, "0")}-`;
  const monthDaily = daily.filter((d) => d.date.startsWith(monthPrefix));
  const spendByDay = new Map(monthDaily.map((d) => [d.date, d.expense]));
  const max = Math.max(1, ...monthDaily.map((d) => d.expense));
  const hasSpending = monthDaily.some((d) => d.expense > 0);
  const first = new Date(monthKey.year, monthKey.month - 1, 1).getDay(); // 0=Sun
  const count = daysInMonth(monthKey);
  const today = toISODate(new Date());
  const weekdays = ["S", "M", "T", "W", "T", "F", "S"];
  const tooltipId = useId();
  const gridRef = useRef<HTMLDivElement>(null);
  // Mouse hover and tap are separate on purpose: a tap also fires a synthetic
  // hover, and sharing one state let the tap immediately toggle it back off.
  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const active = hovered ?? focused ?? pinned;

  useEffect(() => {
    if (!pinned) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!gridRef.current?.contains(e.target as Node)) setPinned(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPinned(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [pinned]);

  return (
    <div>
      <div className="mb-1.5 grid grid-cols-7 gap-0.5 text-center text-label-sm uppercase text-faint sm:gap-1">
        {weekdays.map((d, i) => (
          <span key={i} className={cn((i === 0 || i === 6) && "text-muted")}>
            {d}
          </span>
        ))}
      </div>
      <div ref={gridRef} className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {Array.from({ length: first }).map((_, i) => (
          <span key={`pad-${i}`} />
        ))}
        {Array.from({ length: count }).map((_, i) => {
          const day = i + 1;
          const date = `${monthPrefix}${String(day).padStart(2, "0")}`;
          const spend = spendByDay.get(date) ?? 0;
          const exactAmount = formatINR(spend);
          // Whole rupees only (rounded, not truncated) so the amount always
          // fits on one line; the exact total stays in the tooltip.
          const roundedSpend = Math.round(spend / 100) * 100;
          const amount = roundedSpend >= 100_000 ? formatINRCompact(roundedSpend) : formatINR(roundedSpend, { decimals: "never" });
          const intensity = spend > 0 ? 0.14 + (spend / max) * 0.86 : 0;
          const dayOfWeek = (first + i) % 7;
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          const isToday = date === today;
          // Nothing has happened on a future day yet, so it has nothing to show.
          const isFuture = date > today;
          const isActive = !isFuture && active === date;
          const firstRow = first + i < 7;
          return (
            <button
              key={day}
              type="button"
              disabled={isFuture}
              aria-describedby={isActive ? tooltipId : undefined}
              onPointerEnter={(e) => !isFuture && e.pointerType === "mouse" && setHovered(date)}
              onPointerLeave={(e) => e.pointerType === "mouse" && setHovered((h) => (h === date ? null : h))}
              // Keyboard focus only — a tap also focuses the button, which would
              // otherwise keep the tooltip open after tapping the day again.
              onFocus={(e) => !isFuture && e.currentTarget.matches(":focus-visible") && setFocused(date)}
              onBlur={() => setFocused((f) => (f === date ? null : f))}
              onClick={() => !isFuture && setPinned((p) => (p === date ? null : date))}
              className={cn(
                "relative flex aspect-square min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded-none border border-border-faint px-0.5 py-1 text-center text-label-sm tabular-nums transition-all sm:min-h-14 sm:gap-1 sm:py-1.5",
                "focus:outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring/40",
                isFuture ? "cursor-default" : "hover:z-10 hover:-translate-x-px hover:-translate-y-px hover:shadow-stamp-sm",
                spend > 0 ? "text-fg" : "text-faint",
                isWeekend && spend === 0 && "bg-surface-2/50",
                isToday && "ring-2 ring-fg ring-offset-1 ring-offset-surface",
                isActive && "z-20 -translate-x-px -translate-y-px shadow-stamp-sm",
              )}
              // Coral wash scales with spend — pixel-grid intensity, no blur.
              style={spend > 0 ? { backgroundColor: `hsl(var(--brand) / ${intensity})` } : undefined}
            >
              <time dateTime={date}>{day}</time>
              <span aria-hidden="true" className="max-w-full whitespace-nowrap text-[10px] font-semibold leading-tight sm:text-xs">{amount}</span>
              <span className="sr-only">{spend > 0 ? `${exactAmount} spent` : "No spending"}</span>
              {isActive && (
                <span
                  id={tooltipId}
                  role="tooltip"
                  className={cn(
                    "pointer-events-none absolute z-30 whitespace-nowrap rounded-none border-2 border-border bg-surface px-2.5 py-1.5 text-left normal-case shadow-stamp animate-scale-in",
                    // Below the cell on the first week (nothing above it), above otherwise;
                    // pinned to the near edge on the outer columns so it stays in the card.
                    firstRow ? "top-full mt-1.5" : "bottom-full mb-1.5",
                    dayOfWeek <= 1 ? "left-0" : dayOfWeek >= 5 ? "right-0" : "left-1/2 -translate-x-1/2",
                  )}
                >
                  <span className="block text-[11px] text-muted">
                    {weekdayName(monthKey, day)}, {day} {monthName(monthKey.month, true)} {monthKey.year}
                  </span>
                  <span className="block text-sm font-semibold text-fg">{spend > 0 ? `${exactAmount} spent` : "No spending"}</span>
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-label-sm text-faint">Amounts are rounded; tap or hover a day for its exact total.</p>
      <div className="mt-md flex flex-wrap items-center justify-end gap-x-2 gap-y-1 text-label-sm uppercase text-faint">
        {hasSpending ? (
          <>
            <LegendSwatch label="₹0" />
            <LegendSwatch label={`≤${formatINRCompact(Math.round(max / 3))}`} opacity={0.14 + (1 / 3) * 0.86} />
            <LegendSwatch
              label={`${formatINRCompact(Math.round(max / 3))}–${formatINRCompact(Math.round((max * 2) / 3))}`}
              opacity={0.14 + (2 / 3) * 0.86}
            />
            <LegendSwatch label={`${formatINRCompact(Math.round((max * 2) / 3))}+`} opacity={1} />
          </>
        ) : (
          <span>No spending this month</span>
        )}
      </div>
    </div>
  );
}

function weekdayName(monthKey: MonthKey, day: number): string {
  return new Date(monthKey.year, monthKey.month - 1, day).toLocaleDateString("en-IN", { weekday: "short" });
}

function LegendSwatch({ label, opacity }: { label: string; opacity?: number }) {
  return (
    <span className="flex items-center gap-1">
      <span
        className="h-3 w-3 border border-border-faint"
        style={opacity !== undefined ? { backgroundColor: `hsl(var(--brand) / ${opacity})` } : undefined}
      />
      {label}
    </span>
  );
}
