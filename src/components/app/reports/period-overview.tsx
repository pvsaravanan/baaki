"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUp,
  ArrowUpRight,
  ChevronRight,
  ChevronUp,
  Minus,
  ScrollText,
  Sparkles,
} from "lucide-react";
import { EmptyState } from "@/components/ui/misc";
import { SectionIcon } from "@/components/app/section-icon";
import { PeriodBars } from "@/components/charts/chart-kit";
import type { PeriodReport } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { monthKeyString } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import { categorySlices, shareLabel, type Slice } from "@/lib/report-period";

const INSIGHT = "flex items-center gap-3 rounded-xl bg-brand-soft/50 px-4 py-3";

/** Spending going down is the good direction here. */
function ChangePill({ change, comparedWith }: { change: number; comparedWith: string }) {
  const size = Math.round(Math.abs(change));
  const flat = size === 0;
  const Icon = flat ? Minus : change > 0 ? ArrowUp : ArrowDown;
  return (
    <p
      className={cn(
        "mt-2 inline-flex max-w-full items-start gap-1 rounded-2xl px-3 py-1.5 text-xs font-medium",
        flat ? "bg-surface-2 text-muted" : change > 0 ? "bg-expense/10 text-expense" : "bg-income/10 text-income",
      )}
    >
      <Icon aria-hidden className="mt-px h-3.5 w-3.5 shrink-0" />
      <span>
        {flat ? "Same as" : `${size}% ${change > 0 ? "more than" : "less than"}`} {comparedWith}
      </span>
    </p>
  );
}

function SummaryRow({ icon, label, amount }: { icon: React.ReactNode; label: string; amount: number }) {
  return (
    <div className="flex items-center gap-2.5 py-2">
      <span className="flex w-5 shrink-0 justify-center">{icon}</span>
      <span className="min-w-0 flex-1 text-body-sm text-muted">{label}</span>
      <span className="tnum shrink-0 text-sm font-bold text-fg">{formatINR(amount)}</span>
    </div>
  );
}

/** Each slice in its category's own colour, as on every other chart in the app. */
function SpendDonut<R>({ slices, total }: { slices: Slice<R>[]; total: number }) {
  const radius = 42;
  const length = 2 * Math.PI * radius;
  // A small gap between slices, unless one slice is the whole ring.
  const gap = slices.length > 1 ? 1 : 0;
  let offset = 0;
  return (
    <div className="relative h-44 w-44 shrink-0">
      <svg aria-hidden viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        {slices.map((s) => {
          const size = (s.amount / total) * length;
          const circle = (
            <circle
              key={s.key}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth="13"
              strokeDasharray={`${Math.max(size - gap, 0.5)} ${length}`}
              strokeDashoffset={-offset}
            />
          );
          offset += size;
          return circle;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="tnum text-base font-bold leading-tight text-fg">{formatINR(total)}</span>
        <span className="text-xs text-muted">Total Spent</span>
      </div>
    </div>
  );
}

export function PeriodOverview({ report }: { report: PeriodReport }) {
  const [showAll, setShowAll] = useState(false);
  const { spent, income, transfers, spentChange, comparedWith, trend, lastMonth, categories, insight } = report;

  const top = useMemo(() => categorySlices(categories), [categories]);
  const all = useMemo(() => categorySlices(categories, categories.length), [categories]);
  const slices = showAll ? all : top;
  const month = monthKeyString(lastMonth);

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-3 rounded-xl border border-border/25 p-4 sm:flex-row sm:items-center sm:gap-5">
        <div className="min-w-0 sm:flex-1">
          <p className="text-body-sm text-muted">Total Spent</p>
          <p className="tnum text-[32px] font-extrabold leading-tight tracking-tight text-fg">{formatINR(spent)}</p>
          {spentChange !== null && (spent > 0 || spentChange !== 0) && <ChangePill change={spentChange} comparedWith={comparedWith} />}
        </div>
        <div className="divide-y divide-border/15 border-t border-border/15 pt-1 sm:w-1/2 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
          <SummaryRow icon={<ArrowDownRight className="h-5 w-5 text-expense" />} label="Expenses" amount={spent} />
          <SummaryRow icon={<ArrowUpRight className="h-5 w-5 text-income" />} label="Income" amount={income} />
          <SummaryRow icon={<ArrowLeftRight className="h-5 w-5 text-muted" />} label="Transfers" amount={transfers} />
        </div>
      </section>

      <section>
        <Link href={`/reports?report=cashflow&m=${month}`} className="-my-1 flex min-h-[44px] items-center justify-between gap-3 text-fg">
          <h2 className="text-base font-bold">Spending Trend</h2>
          <ChevronRight aria-hidden className="h-5 w-5 shrink-0" />
        </Link>
        <PeriodBars data={trend} />
      </section>

      <section className="border-t border-border/15 pt-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-fg">Spending by Category</h2>
          {all.length > top.length && (
            <button
              type="button"
              onClick={() => setShowAll((s) => !s)}
              aria-expanded={showAll}
              className="-my-2 flex min-h-[44px] shrink-0 items-center gap-1 text-sm font-semibold text-brand-hover"
            >
              {showAll ? "Show Less" : "View All"}
              {showAll ? <ChevronUp aria-hidden className="h-4 w-4" /> : <ChevronRight aria-hidden className="h-4 w-4" />}
            </button>
          )}
        </div>
        {categories.length === 0 ? (
          <EmptyState
            className="py-6"
            illustration={<SectionIcon section="reports" size={48} />}
            title="No spending in this period"
            description="Categories appear once you record expenses."
          />
        ) : (
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
            <SpendDonut slices={slices} total={spent} />
            <ul className="w-full min-w-0 flex-1 divide-y divide-border/15">
              {slices.map((s) => (
                <li key={s.key} className="flex items-center gap-2.5 py-2 text-[13px]">
                  <span aria-hidden className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="min-w-0 flex-1 truncate text-fg">{s.name}</span>
                  <span className="tnum shrink-0 text-fg">{formatINR(s.amount)}</span>
                  <span className="tnum w-9 shrink-0 text-right text-muted">{shareLabel(s.amount, spent)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {insight &&
        (insight.categoryId ? (
          <Link href={`/categories/detail?id=${insight.categoryId}`} className={INSIGHT}>
            <InsightText message={insight.message} />
            <ChevronRight aria-hidden className="h-5 w-5 shrink-0 text-fg" />
          </Link>
        ) : (
          <div className={INSIGHT}>
            <InsightText message={insight.message} />
          </div>
        ))}

      <Link
        href={`/reports?report=overview&m=${month}`}
        className="flex items-center gap-3 rounded-xl border border-border/25 px-4 py-3 text-fg transition-colors hover:bg-brand-soft/20 active:bg-brand-soft/30"
      >
        <ScrollText aria-hidden className="h-5 w-5 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">Detailed Reports</span>
          <span className="block text-xs text-muted">Any month, by account, income, expenses and cash flow</span>
        </span>
        <ChevronRight aria-hidden className="h-5 w-5 shrink-0" />
      </Link>
    </div>
  );
}

function InsightText({ message }: { message: string }) {
  return (
    <>
      <Sparkles aria-hidden className="h-6 w-6 shrink-0 text-brand-hover" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-fg">Insight</span>
        <span className="block text-xs text-muted">{message}</span>
      </span>
    </>
  );
}
