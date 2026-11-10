"use client";
import { Lightbulb, Plus, TrendingUp, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { Money } from "@/components/money";
import { CategoryIcon } from "@/components/app/category-icon";
import { SectionIcon } from "@/components/app/section-icon";
import { useAppData } from "./app-data";
import { BudgetEditor } from "./budget-editor";
import { budgetInsight, type BudgetInsight } from "@/lib/budget-insight";
import { cn } from "@/lib/cn";
import { formatPercent } from "@/lib/money";
import { budgetStatus, type BudgetState, type BudgetStatus } from "@/lib/calculations";
import type { MonthKey } from "@/lib/dates";
import type { CategoryDTO } from "@/lib/types";

interface BudgetLineData {
  categoryId: string;
  name: string;
  color: string;
  icon: string;
  limit: number;
  spent: number;
  status: BudgetStatus;
}

export interface BudgetData {
  overallLimit: number | null;
  overallSpent: number;
  status: BudgetStatus | null;
  lines: BudgetLineData[];
  /** Accounts the budget covers; empty means all accounts. */
  accountIds: string[];
}

const PANEL = "rounded-xl border border-border/25";

const BAR_TONE: Record<BudgetState, string> = {
  under: "bg-brand-hover",
  warning: "bg-warning",
  over: "bg-expense",
};

const RING_TONE: Record<BudgetState, string> = {
  under: "stroke-brand-hover",
  warning: "stroke-warning",
  over: "stroke-expense",
};

const INSIGHT_TONE: Record<BudgetInsight["tone"], { panel: string; hill: string }> = {
  good: { panel: "bg-income/10", hill: "text-income" },
  caution: { panel: "bg-warning/10", hill: "text-warning" },
  over: { panel: "bg-expense/10", hill: "text-expense" },
};

function utilizationLabel(status: BudgetStatus): string {
  return Number.isFinite(status.utilization) ? formatPercent(status.utilization, 0) : "—";
}

export function BudgetsView({
  budget,
  categories,
  monthKey,
  editing,
  onEditingChange,
}: {
  budget: BudgetData;
  categories: CategoryDTO[];
  monthKey: MonthKey;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
}) {
  const { accounts } = useAppData();
  const edit = () => onEditingChange(true);

  const hasBudget = budget.overallLimit != null || budget.lines.length > 0;
  const totalLimit = budget.overallLimit ?? budget.lines.reduce((s, l) => s + l.limit, 0);
  const overallStatus = totalLimit > 0 ? budgetStatus(budget.overallSpent, totalLimit) : null;
  const countedAccounts = budget.accountIds
    .map((id) => accounts.find((a) => a.id === id)?.name)
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-5">
      {!hasBudget || !overallStatus ? (
        <div className={PANEL}>
          <EmptyState
            illustration={<SectionIcon section="budgets" size={56} />}
            title="No budget set for this month"
            description="Set an overall monthly limit and per-category budgets to keep your spending on track."
            action={
              <Button onClick={edit}>
                <Plus className="h-4 w-4" />
                Set a budget
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <Overview status={overallStatus} countedAccounts={countedAccounts} />

          <section>
            <div className="mb-2 flex items-center justify-between gap-3">
              <h2 className="text-base font-bold text-fg">Category Budgets</h2>
              <button
                type="button"
                onClick={edit}
                className="-mr-2 min-h-[44px] px-2 text-sm font-semibold text-brand-hover active:opacity-70"
              >
                Manage
              </button>
            </div>
            {budget.lines.length === 0 ? (
              <div className={PANEL}>
                <EmptyState
                  className="py-8"
                  title="No category budgets"
                  description="Add per-category limits to track spending in each area."
                  action={
                    <Button variant="secondary" size="sm" onClick={edit}>
                      <Plus className="h-4 w-4" />
                      Add category budgets
                    </Button>
                  }
                />
              </div>
            ) : (
              <div className="space-y-2.5">
                {budget.lines.map((line) => (
                  <CategoryRow key={line.categoryId} line={line} />
                ))}
              </div>
            )}
          </section>

          <InsightBanner insight={budgetInsight(overallStatus, monthKey, new Date())} />
        </>
      )}

      {editing && (
        <BudgetEditor
          onClose={() => onEditingChange(false)}
          budget={budget}
          categories={categories}
          monthKey={monthKey}
        />
      )}
    </div>
  );
}

function Overview({ status, countedAccounts }: { status: BudgetStatus; countedAccounts: string }) {
  const { remaining, state } = status;
  return (
    <section className={cn(PANEL, "flex items-center gap-4 p-4")}>
      <UsageRing status={status} />
      <div aria-hidden className="w-px self-stretch bg-border/20" />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-1.5 text-fg">
          <Money paise={status.spent} tone="default" className="text-xl font-bold" />
          <span className="text-sm text-muted">
            / <Money paise={status.limit} tone="default" />
          </span>
        </p>
        <p className="mt-0.5 text-body-sm text-muted">Total Budget</p>
        {/* Worth saying only when it narrows what the numbers above count. */}
        {countedAccounts && <p className="mt-0.5 text-xs text-muted">Counting {countedAccounts}</p>}
        <p
          className={cn(
            "mt-2.5 inline-flex max-w-full flex-wrap items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold",
            state === "under" && "bg-income/10 text-income",
            state === "warning" && "bg-warning/10 text-warning",
            state === "over" && "bg-expense/10 text-expense",
          )}
        >
          {remaining < 0 ? <TriangleAlert className="h-4 w-4 shrink-0" /> : <TrendingUp className="h-4 w-4 shrink-0" />}
          <span>
            <Money paise={Math.abs(remaining)} tone="default" /> {remaining < 0 ? "over" : "left"}
          </span>
        </p>
      </div>
    </section>
  );
}

const RING_RADIUS = 42;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/** How much of the budget is used, clockwise from the top. Past 100% the ring is simply full. */
function UsageRing({ status }: { status: BudgetStatus }) {
  const filled = Math.max(0, Math.min(status.utilization, 100)) / 100;
  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg aria-hidden viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={RING_RADIUS} fill="none" strokeWidth="10" className="stroke-brand-soft" />
        {filled > 0 && (
          <circle
            cx="50"
            cy="50"
            r={RING_RADIUS}
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${filled * RING_LENGTH} ${RING_LENGTH}`}
            className={cn("transition-[stroke-dasharray] duration-500 motion-reduce:transition-none", RING_TONE[status.state])}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="tnum text-xl font-bold leading-tight text-fg">{utilizationLabel(status)}</span>
        <span className="text-xs text-muted">Used</span>
      </div>
    </div>
  );
}

function CategoryRow({ line }: { line: BudgetLineData }) {
  const { state, remaining, utilization } = line.status;
  return (
    <div className={cn(PANEL, "flex items-center gap-3 bg-brand-soft/25 px-3 py-3")}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center" style={{ color: line.color }}>
        <CategoryIcon icon={line.icon} size={36} />
      </span>
      <div className="min-w-0 flex-1">
        {/* The amounts drop below the name when both won't fit on one line. */}
        <div className="flex flex-wrap items-baseline justify-between gap-x-2">
          <span className="min-w-0 truncate text-sm font-bold text-fg">{line.name}</span>
          <span className="whitespace-nowrap text-xs text-fg">
            <Money paise={line.spent} tone="default" /> / <Money paise={line.limit} tone="default" />
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-brand-soft">
          <div
            className={cn("h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none", BAR_TONE[state])}
            style={{ width: `${Math.max(0, Math.min(utilization, 100))}%` }}
          />
        </div>
        {state === "warning" && (
          <p className="mt-1.5 text-xs font-medium text-warning">
            Near limit: <Money paise={remaining} tone="default" /> left
          </p>
        )}
        {state === "over" && (
          <p className="mt-1.5 text-xs font-medium text-expense">
            {remaining < 0 ? (
              <>
                Over by <Money paise={-remaining} tone="default" />
              </>
            ) : (
              "Limit reached"
            )}
          </p>
        )}
      </div>
      <span className="w-10 shrink-0 text-right text-xs text-fg">{utilizationLabel(line.status)}</span>
    </div>
  );
}

function InsightBanner({ insight }: { insight: BudgetInsight }) {
  const tone = INSIGHT_TONE[insight.tone];
  return (
    <section className={cn("relative flex items-start gap-3 overflow-hidden rounded-xl border border-border/15 p-4", tone.panel)}>
      {/* Decoration only: this shape isn't plotted from any data. */}
      <svg
        aria-hidden
        viewBox="0 0 200 80"
        preserveAspectRatio="none"
        className={cn("pointer-events-none absolute bottom-0 right-0 h-full w-1/2 opacity-20", tone.hill)}
      >
        <path d="M0 80 C40 78 60 62 90 52 C115 44 125 56 145 40 C165 22 175 10 200 14 V80 Z" fill="currentColor" />
      </svg>
      <Lightbulb className="relative mt-0.5 h-7 w-7 shrink-0 text-fg" strokeWidth={1.75} />
      <div className="relative min-w-0">
        <h2 className="text-base font-bold text-fg">{insight.title}</h2>
        <p className="mt-0.5 text-body-sm text-muted">{insight.message}</p>
      </div>
    </section>
  );
}
