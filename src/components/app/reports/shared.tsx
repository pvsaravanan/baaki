import { Money } from "@/components/money";
import type { MonthlyAnalytics } from "@/lib/analytics";

/** Analytics with all Date fields serialized to ISO strings (safe for a client component). */
export type ReportsAnalytics = Omit<MonthlyAnalytics, "largestExpense"> & {
  largestExpense:
    | { description: string; amount: number; date: string; categoryName: string | null }
    | null;
};

export interface PerAccountRow {
  accountId: string;
  expense: number; // effective expense this month (paise)
  income: number; // income this month (paise)
  count: number;
}

export function Tile({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border border-border/25 bg-surface p-3.5 [container-type:inline-size]">
      <p className="text-xs font-medium text-muted">{label}</p>
      {/* Fluid size so a large value fits the tile instead of wrapping; text
          values still wrap naturally (no nowrap). */}
      <div className="mt-1.5 font-bold text-fg text-[clamp(1rem,9.5cqi,1.5rem)]">{children}</div>
      {hint && <p className="mt-1 text-2xs text-muted">{hint}</p>}
    </div>
  );
}

const plural = (word: string) => (word.endsWith("y") ? `${word.slice(0, -1)}ies` : `${word}s`);

/** Total / Average / Highest / Lowest tiles for a series of money values. */
export function DistributionTiles({ values, unit = "amount" }: { values: number[]; unit?: string }) {
  const total = values.reduce((s, v) => s + v, 0);
  const avg = values.length ? Math.round(total / values.length) : 0;
  const highest = values.length ? Math.max(...values) : 0;
  const lowest = values.length ? Math.min(...values) : 0;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Tile label="Total" hint={`across ${values.length} ${values.length === 1 ? unit : plural(unit)}`}>
        <Money paise={total} tone="default" />
      </Tile>
      <Tile label="Average">
        <Money paise={avg} tone="default" />
      </Tile>
      <Tile label="Highest">
        <Money paise={highest} tone="default" />
      </Tile>
      <Tile label="Lowest">
        <Money paise={lowest} tone="default" />
      </Tile>
    </div>
  );
}

/** The six months the report charts and tables cover, oldest first, ending with the month being viewed. */
export function lastSixMonths(a: Pick<ReportsAnalytics, "incomeExpenseTrend">) {
  return a.incomeExpenseTrend.slice(-6);
}

export function dailySeries(a: ReportsAnalytics, key: "expense" | "income") {
  const isMultiMonth = a.daily.length > 31;
  return a.daily.map((d) => {
    // Single month: "1", "2", … "31". Multi-month: "Jun 1", "Jun 15", …
    const day = Number(d.date.slice(8, 10));
    const label = isMultiMonth
      ? `${MONTH_SHORT[Number(d.date.slice(5, 7)) - 1]} ${day}`
      : String(day);
    return { label, value: d[key] };
  });
}

const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
