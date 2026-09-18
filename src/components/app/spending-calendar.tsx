import React from "react";
import { formatINR, formatINRCompact } from "@/lib/money";
import { daysInMonth, monthName, type MonthKey } from "@/lib/dates";
import { cn } from "@/lib/cn";

/**
 * Calendar heatmap of daily spending. Intensity scales with each day's
 * effective expense relative to the busiest day in the month.
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
  const first = new Date(monthKey.year, monthKey.month - 1, 1).getDay(); // 0=Sun
  const count = daysInMonth(monthKey);
  const weekdays = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div>
      <div className="mb-1.5 grid grid-cols-7 gap-1 text-center text-label-sm uppercase text-faint">
        {weekdays.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: first }).map((_, i) => (
          <span key={`pad-${i}`} />
        ))}
        {Array.from({ length: count }).map((_, i) => {
          const day = i + 1;
          const date = `${monthPrefix}${String(day).padStart(2, "0")}`;
          const spend = spendByDay.get(date) ?? 0;
          const exactAmount = formatINR(spend);
          const amount = spend >= 100_000 ? formatINRCompact(spend) : exactAmount;
          const intensity = spend > 0 ? 0.14 + (spend / max) * 0.86 : 0;
          return (
            <div
              key={day}
              title={`${day} ${monthName(monthKey.month, true)} ${monthKey.year} — ${spend > 0 ? exactAmount : "No spending"}`}
              className={cn(
                "flex aspect-square min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-none border border-border-faint px-0.5 py-1.5 text-center text-label-sm tabular-nums",
                spend > 0 ? "text-fg" : "text-faint",
              )}
              // Coral wash scales with spend — pixel-grid intensity, no blur.
              style={spend > 0 ? { backgroundColor: `hsl(var(--brand) / ${intensity})` } : undefined}
            >
              <time dateTime={date}>{day}</time>
              <span aria-hidden="true" className="max-w-full break-all text-[10px] font-semibold leading-tight sm:text-xs">{amount}</span>
              <span className="sr-only">{exactAmount} spent</span>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-label-sm text-faint">Large amounts are abbreviated; hover for exact totals.</p>
      <p className="mt-md flex items-center justify-end gap-1 text-label-sm uppercase text-faint">
        Less
        {[0.15, 0.4, 0.65, 0.9].map((o) => (
          <span
            key={o}
            className="h-3 w-3 border border-border-faint"
            style={{ backgroundColor: `hsl(var(--brand) / ${o})` }}
          />
        ))}
        More
      </p>
    </div>
  );
}
