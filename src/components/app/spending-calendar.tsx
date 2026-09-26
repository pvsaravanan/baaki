import React from "react";
import { formatINR, formatINRCompact } from "@/lib/money";
import { daysInMonth, monthName, toISODate, type MonthKey } from "@/lib/dates";
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
  const hasSpending = monthDaily.some((d) => d.expense > 0);
  const first = new Date(monthKey.year, monthKey.month - 1, 1).getDay(); // 0=Sun
  const count = daysInMonth(monthKey);
  const today = toISODate(new Date());
  const weekdays = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div>
      <div className="mb-1.5 grid grid-cols-7 gap-0.5 text-center text-label-sm uppercase text-faint sm:gap-1">
        {weekdays.map((d, i) => (
          <span key={i} className={cn((i === 0 || i === 6) && "text-muted")}>
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
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
          const dayOfWeek = (first + i) % 7;
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          const isToday = date === today;
          return (
            <div
              key={day}
              title={`${day} ${monthName(monthKey.month, true)} ${monthKey.year} — ${spend > 0 ? exactAmount : "No spending"}`}
              className={cn(
                "relative flex aspect-square min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded-none border border-border-faint px-0.5 py-1 text-center text-label-sm tabular-nums transition-all sm:min-h-14 sm:gap-1 sm:py-1.5",
                "hover:z-10 hover:-translate-x-px hover:-translate-y-px hover:shadow-stamp-sm",
                spend > 0 ? "text-fg" : "text-faint",
                isWeekend && spend === 0 && "bg-surface-2/50",
                isToday && "ring-2 ring-fg ring-offset-1 ring-offset-surface",
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
