"use client";
import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { formatINR, formatINRCompact } from "@/lib/money";
import { daysInMonth, monthName, toISODate, type MonthKey } from "@/lib/dates";
import { cn } from "@/lib/cn";

/**
 * Calendar heatmap of daily spending. Intensity scales with each day's
 * effective expense relative to the busiest day in the month. Each day shows
 * its exact total in a small tooltip — on mouse hover, keyboard focus, or a
 * tap (which pins it until you tap elsewhere), so it works on touch screens
 * where there is no hover. There's a single tooltip for the whole grid: moving
 * between days glides it to the new day instead of popping a new one.
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

  // The tooltip keeps showing the last day while it fades out, so its text
  // doesn't vanish mid-fade.
  const [shown, setShown] = useState<string | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const cellRefs = useRef(new Map<string, HTMLButtonElement>());
  // Glide between days only while already visible; a fresh appearance just
  // fades in where it belongs instead of flying in from the last spot.
  const [glide, setGlide] = useState(false);
  const [visible, setVisible] = useState(false);
  const visibleRef = useRef(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const place = useCallback((date: string) => {
    const cell = cellRefs.current.get(date);
    const tip = tipRef.current;
    const grid = gridRef.current;
    if (!cell || !tip || !grid) return;
    const gap = 6;
    const x = cell.offsetLeft + cell.offsetWidth / 2 - tip.offsetWidth / 2;
    const clampedX = Math.min(Math.max(0, x), grid.clientWidth - tip.offsetWidth);
    // Below the cell on the first week (nothing above it), above otherwise.
    const below = cell.offsetTop < cell.offsetHeight;
    const y = below ? cell.offsetTop + cell.offsetHeight + gap : cell.offsetTop - tip.offsetHeight - gap;
    setPos({ x: clampedX, y });
  }, []);

  useLayoutEffect(() => {
    if (active) {
      clearTimeout(hideTimer.current);
      setGlide(visibleRef.current);
      visibleRef.current = true;
      setVisible(true);
      setShown(active);
      return;
    }
    // Moving the mouse from one day to the next briefly leaves no day active;
    // wait a beat before hiding so that glides instead of blinking.
    hideTimer.current = setTimeout(() => {
      visibleRef.current = false;
      setVisible(false);
      setGlide(false);
    }, 90);
  }, [active]);

  useEffect(() => () => clearTimeout(hideTimer.current), []);

  // Measure after the new day's text has rendered (its width can change).
  useLayoutEffect(() => {
    if (shown) place(shown);
  }, [shown, place]);

  useEffect(() => {
    if (!shown) return;
    const onResize = () => place(shown);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [shown, place]);

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
      <div ref={gridRef} className="relative grid grid-cols-7 gap-0.5 sm:gap-1">
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
          return (
            <button
              key={day}
              ref={(el) => {
                if (el) cellRefs.current.set(date, el);
                else cellRefs.current.delete(date);
              }}
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
                "relative flex aspect-square min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded-none border border-border-faint px-0.5 py-1 text-center text-label-sm tabular-nums sm:min-h-14 sm:gap-1 sm:py-1.5",
                "transition-[transform,box-shadow] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
                "focus:outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring/40",
                isFuture ? "cursor-default" : "hover:z-10 hover:-translate-x-px hover:-translate-y-px hover:shadow-stamp-sm",
                spend > 0 ? "text-fg" : "text-faint",
                isWeekend && spend === 0 && "bg-surface-2/50",
                isToday && "ring-2 ring-fg ring-offset-1 ring-offset-surface",
                isActive && "z-20 -translate-x-px -translate-y-px shadow-stamp-sm",
              )}
              // Heat wash scales with spend (--heat: coral in both themes) — no blur.
              style={spend > 0 ? { backgroundColor: `hsl(var(--heat) / ${intensity})` } : undefined}
            >
              <time dateTime={date}>{day}</time>
              <span aria-hidden="true" className="max-w-full whitespace-nowrap text-[10px] font-semibold leading-tight sm:text-xs">{amount}</span>
              <span className="sr-only">{spend > 0 ? `${exactAmount} spent` : "No spending"}</span>
            </button>
          );
        })}
        <span
          ref={tipRef}
          id={tooltipId}
          role="tooltip"
          aria-hidden={!visible}
          className="pointer-events-none absolute left-0 top-0 z-30 whitespace-nowrap rounded-none border-2 border-border bg-surface px-2.5 py-1.5 text-left normal-case shadow-stamp motion-reduce:transition-none"
          style={{
            transform: pos ? `translate3d(${pos.x}px, ${pos.y}px, 0)` : undefined,
            opacity: visible && pos ? 1 : 0,
            visibility: shown ? "visible" : "hidden",
            transition: glide
              ? "transform 260ms cubic-bezier(0.32, 0.72, 0, 1), opacity 160ms ease-out"
              : "opacity 160ms ease-out",
          }}
        >
          {shown && <TooltipBody monthKey={monthKey} date={shown} spend={spendByDay.get(shown) ?? 0} />}
        </span>
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

function TooltipBody({ monthKey, date, spend }: { monthKey: MonthKey; date: string; spend: number }) {
  const day = Number(date.slice(-2));
  return (
    <>
      <span className="block text-[11px] text-muted">
        {weekdayName(monthKey, day)}, {day} {monthName(monthKey.month, true)} {monthKey.year}
      </span>
      <span className="block text-sm font-semibold text-fg">{spend > 0 ? `${formatINR(spend)} spent` : "No spending"}</span>
    </>
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
        style={opacity !== undefined ? { backgroundColor: `hsl(var(--heat) / ${opacity})` } : undefined}
      />
      {label}
    </span>
  );
}
