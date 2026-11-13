"use client";
import React, { useState } from "react";
import { formatINR, formatINRCompact } from "@/lib/money";
import { daysInMonth, monthName, toISODate, type MonthKey } from "@/lib/dates";
import { cn } from "@/lib/cn";

type DailyPoint = { date: string; expense: number; income?: number; count?: number };

/**
 * A month of spending as bubbles: each day is a coral disc whose area follows
 * what was spent that day, so the heavy days jump out without a legend and the
 * quiet ones almost disappear. Above the grid sit three numbers for the month
 * (spent, daily average, busiest day); below it, a readout for the chosen day
 * (today by default, else the busiest) with its exact total and how it compares
 * with the average. Tapping a day chooses it, so there is no hover to rely on.
 */
export function SpendingCalendar({ monthKey, daily }: { monthKey: MonthKey; daily: DailyPoint[] }) {
  const monthPrefix = `${monthKey.year}-${String(monthKey.month).padStart(2, "0")}-`;
  const byDay = new Map(daily.filter((d) => d.date.startsWith(monthPrefix)).map((d) => [d.date, d]));
  const spendOf = (date: string) => byDay.get(date)?.expense ?? 0;

  const first = new Date(monthKey.year, monthKey.month - 1, 1).getDay(); // 0 = Sunday
  const count = daysInMonth(monthKey);
  const today = toISODate(new Date());
  const dates = Array.from({ length: count }, (_, i) => `${monthPrefix}${String(i + 1).padStart(2, "0")}`);
  // Days that have happened: all of a past month, up to today in this one, none in the future.
  const elapsed = dates.filter((d) => d <= today);

  const total = elapsed.reduce((sum, d) => sum + spendOf(d), 0);
  const average = elapsed.length > 0 ? total / elapsed.length : 0;
  const max = elapsed.reduce((m, d) => Math.max(m, spendOf(d)), 0);
  const busiest = max > 0 ? elapsed.find((d) => spendOf(d) === max) ?? null : null;

  const [picked, setPicked] = useState<string | null>(null);
  const fallback = today.startsWith(monthPrefix) ? today : busiest;
  const selected = picked && picked.startsWith(monthPrefix) && picked <= today ? picked : fallback;

  return (
    <div>
      <dl className="grid grid-cols-3 gap-2">
        <Stat label="Spent" value={formatINRCompact(total)} />
        <Stat label="Daily avg" value={formatINRCompact(Math.round(average))} />
        <Stat label="Busiest" value={busiest ? `${Number(busiest.slice(-2))} ${monthName(monthKey.month, true)}` : "–"} />
      </dl>

      <div className="mb-1 mt-md grid grid-cols-7 text-center text-label-sm uppercase text-faint" aria-hidden="true">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: first }).map((_, i) => (
          <span key={`pad-${i}`} />
        ))}
        {dates.map((date) => {
          const day = Number(date.slice(-2));
          const spend = spendOf(date);
          const isFuture = date > today;
          const isToday = date === today;
          const isSelected = date === selected;
          // Area follows spend (so the size reads true). The floor is wide enough to hold a two-digit
          // day with room to spare, and the cap leaves a gutter inside the date's circle.
          const t = spend > 0 && max > 0 ? Math.sqrt(spend / max) : 0;
          const size = spend > 0 ? 54 + t * 22 : 0;
          return (
            <button
              key={date}
              type="button"
              disabled={isFuture}
              aria-pressed={isSelected}
              aria-label={`${day} ${monthName(monthKey.month, true)}: ${spend > 0 ? `${formatINR(spend)} spent` : "no spending"}`}
              onClick={() => setPicked(date)}
              className={cn(
                "group relative mx-auto flex aspect-square w-full max-w-12 items-center justify-center rounded-full",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                isFuture ? "cursor-default" : "active:scale-95",
                "transition-transform duration-150 motion-reduce:transition-none",
              )}
            >
              {size > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute rounded-full transition-[width,height,background-color] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none"
                  style={{ width: `${size}%`, height: `${size}%`, backgroundColor: `hsl(var(--heat) / ${0.35 + t * 0.65})` }}
                />
              )}
              {/* Every date sits in the same-sized circle: a faint outline, and a bold ring when chosen. */}
              {!isFuture && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-[4%] rounded-full border-2 transition-colors duration-150 motion-reduce:transition-none",
                    isSelected ? "border-fg" : "border-border-faint",
                  )}
                />
              )}
              <span
                aria-hidden="true"
                className={cn(
                  "relative text-label-sm tabular-nums",
                  isFuture ? "text-faint/50" : spend > 0 ? "font-bold text-fg" : "text-muted",
                  isToday && "underline decoration-2 underline-offset-4",
                )}
              >
                {day}
              </span>
            </button>
          );
        })}
      </div>

      <DayReadout monthKey={monthKey} date={selected} point={selected ? byDay.get(selected) : undefined} average={average} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-2/60 px-3 py-2">
      <dt className="text-label-sm uppercase text-faint">{label}</dt>
      <dd className="text-base font-bold leading-tight text-fg">{value}</dd>
    </div>
  );
}

function DayReadout({
  monthKey,
  date,
  point,
  average,
}: {
  monthKey: MonthKey;
  date: string | null;
  point?: DailyPoint;
  average: number;
}) {
  if (!date) {
    return <p className="mt-md text-center text-label-sm text-faint">No spending this month yet.</p>;
  }
  const day = Number(date.slice(-2));
  const weekday = new Date(monthKey.year, monthKey.month - 1, day).toLocaleDateString("en-IN", { weekday: "long" });
  const spend = point?.expense ?? 0;
  const income = point?.income ?? 0;
  const txns = point?.count ?? 0;
  const ratio = average > 0 ? spend / average : 0;
  const note =
    spend === 0 ? "No spending" : ratio >= 1.5 ? `${ratio.toFixed(1)}× your daily average` : ratio <= 0.5 ? "A light day" : "About average";
  return (
    <div className="mt-md flex items-center justify-between gap-3 rounded-2xl border border-border-faint px-4 py-3" aria-live="polite">
      <div className="min-w-0">
        <p className="text-label-sm uppercase text-faint">
          {weekday}, {day} {monthName(monthKey.month, true)}
        </p>
        <p className="text-xl font-bold leading-tight text-fg">{spend > 0 ? formatINR(spend) : "₹0"}</p>
      </div>
      <div className="shrink-0 text-right text-label-sm text-muted">
        <p className="font-semibold text-fg">{note}</p>
        {txns > 0 && <p>{txns} {txns === 1 ? "transaction" : "transactions"}</p>}
        {income > 0 && <p className="text-income">+{formatINR(income)} in</p>}
      </div>
    </div>
  );
}
