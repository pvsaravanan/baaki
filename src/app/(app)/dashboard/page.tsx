"use client";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowUpRight, CalendarClock } from "lucide-react";
import { usePageData } from "@/lib/local-api";
import type { PageData } from "@/server/pages";
import { useAppData } from "@/components/app/app-data";
import { useMonthParam } from "@/components/app/use-month-param";
import { ScreenData } from "@/components/app/screen-data";
import { DashboardSkeleton } from "@/components/app/dashboard-skeleton";
import { isWidgetKey, widgetKind, type WidgetKey } from "@/lib/dashboard-widgets";
import { fromISODate, formatDate, addDays, monthName, zonedParts, type MonthKey } from "@/lib/dates";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Money } from "@/components/money";
import { Progress, Badge, EmptyState } from "@/components/ui/misc";
import { CategoryIcon } from "@/components/app/category-icon";
import { DashboardGreeting } from "@/components/app/dashboard/greeting";
import { BalanceHero, SummaryTile } from "@/components/app/dashboard/summary";
import { SpendingCategoryCard } from "@/components/app/dashboard/category-card";
import { RecentTransactionsCard } from "@/components/app/dashboard/recent-card";
import { MonthNav } from "@/components/app/month-nav";
import { TopbarSlot } from "@/components/app/topbar-slot";
import { MonthContent, MonthScope } from "@/components/app/month-scope";
import { SpendingCalendar } from "@/components/app/spending-calendar";
import { IncomeExpenseCard } from "@/components/app/income-expense-card";
import { formatINR, formatPercent } from "@/lib/money";
import { cn } from "@/lib/cn";

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}

/**
 * On a phone the default dashboard is exactly one screen: it takes the height
 * between the top bar and the bottom bar and never scrolls (the recent list
 * shows as many rows as fit). Widgets the user adds in Settings don't fit on
 * one screen, so a layout with any of them flows and scrolls as usual.
 */
const FIT_TILES = new Set<WidgetKey>(["balance", "income", "expenses", "net_savings"]);
const FIT_CARDS = new Set<WidgetKey>(["spending_categories", "recent_transactions"]);
function fitsOneScreen(widgets: string[]): boolean {
  return widgets.filter(isWidgetKey).every((k) => (widgetKind(k) === "tile" ? FIT_TILES : FIT_CARDS).has(k));
}

function Dashboard() {
  const { user } = useAppData();
  const { m, monthKey, isCurrent } = useMonthParam();
  const { data, error, isStale } = usePageData("dashboard", { m });
  const fit = !data || fitsOneScreen(data.preference.dashboardWidgets);

  return (
    <MonthScope monthKey={m} loading={isStale}>
      <div
        className={cn(
          "flex flex-col gap-[clamp(6px,1.2dvh,12px)] md:gap-4",
          fit && "h-[calc(100dvh-10.75rem-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))] overflow-hidden md:h-auto md:overflow-visible",
        )}
      >
        <DashboardGreeting greeting={greeting().toUpperCase()} name={user.name.split(" ")[0]} monthName={monthName(monthKey.month)} />
        <TopbarSlot>
          <MonthNav monthKey={monthKey} isCurrent={isCurrent} bar />
        </TopbarSlot>
        <MonthContent className="flex min-h-0 flex-1 flex-col gap-[clamp(6px,1.2dvh,12px)] md:flex-none md:gap-5">
          <ScreenData data={data} error={error} skeleton={<DashboardSkeleton header={false} />}>
            {(d) => <DashboardBody data={d} monthKey={monthKey} fit={fit} />}
          </ScreenData>
        </MonthContent>
      </div>
    </MonthScope>
  );
}

function DashboardBody({ data, monthKey, fit }: { data: PageData<"dashboard">; monthKey: MonthKey; fit: boolean }) {
  const { analytics: a, preference: pref, recent, recurring } = data;

  const budgetLimit = a.budget.overallLimit ?? a.budget.lines.reduce((s, l) => s + l.limit, 0);
  const budgetRemaining = budgetLimit - a.budget.overallSpent;

  // Upcoming recurring within ~45 days.
  const horizon = addDays(new Date(), 45);
  const upcoming = recurring
    .filter((r) => r.isActive)
    // fromISODate can return null on an unparseable date; skip those rows
    // instead of crashing the whole dashboard render.
    .flatMap((r) => {
      const date = fromISODate(r.nextOccurrence);
      return date && date <= horizon ? [{ r, date }] : [];
    })
    .sort((x, y) => x.date.getTime() - y.date.getTime())
    .slice(0, 5);

  // Every tile and card is its own Settings widget (see dashboard-widgets);
  // the enabled ones render in the saved order — tiles in the top row, cards
  // below.
  const order = pref.dashboardWidgets.filter(isWidgetKey);
  const TILES: Partial<Record<WidgetKey, React.ReactNode>> = {
    income: <SummaryTile key="income" label="Income" value={a.current.income} tone="income" delta={a.deltas.income} deltaGood="up" />,
    expenses: <SummaryTile key="expenses" label="Expenses" value={a.current.effectiveExpense} tone="expense" delta={a.deltas.expense} deltaGood="down" />,
    net_savings: <SummaryTile key="net_savings" label="Savings" value={a.current.net} tone={a.current.net >= 0 ? "income" : "expense"} delta={a.deltas.net} deltaGood="up" />,
    savings_rate: <SavingsRateCard key="savings_rate" rate={a.current.savingsRate} delta={a.deltas.savings} />,
    budget_left: <BudgetRemainingCard key="budget_left" remaining={budgetRemaining} limit={budgetLimit} />,
  };
  const tiles = order.filter((k) => widgetKind(k) === "tile" && k !== "balance").flatMap((k) => (TILES[k] ? [TILES[k]] : []));
  const showBalance = order.includes("balance");

  const CARDS: Partial<Record<WidgetKey, { wide: boolean; node: React.ReactNode | null }>> = {
    income_vs_expenses: { wide: true, node: <IncomeExpenseCard trend={a.incomeExpenseTrend} /> },
    spending_calendar: {
      wide: true,
      node: (
        <Card>
          <CardHeader
            title="Spending calendar"
            subtitle="Every day, sized by what you spent"
            action={<span className="text-label-sm uppercase text-muted">{a.transactionCount} txns</span>}
          />
          <CardBody className="pt-2">
            <SpendingCalendar monthKey={monthKey} daily={a.daily} />
          </CardBody>
        </Card>
      ),
    },
    recent_transactions: { wide: false, node: <RecentTransactionsCard transactions={recent} fit={fit} /> },
    spending_categories: {
      wide: false,
      node: (
        <SpendingCategoryCard
          categories={a.categories.map((c) => ({ name: c.name, value: c.net, color: c.color }))}
          total={a.current.effectiveExpense}
        />
      ),
    },
    budget_progress: {
      wide: false,
      node: (
        <Card>
          <CardHeader title="Budget" subtitle={budgetLimit > 0 ? `${formatINR(a.budget.overallSpent)} of ${formatINR(budgetLimit)}` : undefined} action={<Link href="/budgets" className="text-label-sm uppercase text-brand-hover underline-offset-4 hover:underline">Manage</Link>} />
          <CardBody>
            {budgetLimit === 0 ? (
              <EmptyState title="No budget set" description="Set monthly limits to track spending." action={<Link href="/budgets" className="text-sm font-medium text-brand-hover hover:underline">Set a budget</Link>} />
            ) : (
              <div className="space-y-3">
                <Progress value={budgetLimit > 0 ? (a.budget.overallSpent / budgetLimit) * 100 : 0} tone={budgetRemaining < 0 ? "expense" : (a.budget.overallSpent / budgetLimit) >= 0.9 ? "warning" : "brand"} />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">{budgetRemaining >= 0 ? "Remaining" : "Over budget"}</span>
                  <Money paise={Math.abs(budgetRemaining)} tone={budgetRemaining >= 0 ? "income" : "expense"} className="font-semibold" />
                </div>
                {a.budget.lines.filter((l) => l.status.state !== "under").slice(0, 3).map((l) => (
                  <div key={l.categoryId} className="flex items-center gap-2 text-xs">
                    <CategoryIcon icon={l.icon} size={16} />
                    <span className="text-fg">{l.name}</span>
                    <Badge tone={l.status.state === "over" ? "expense" : "warning"} className="ml-auto">
                      {l.status.state === "over" ? "Over" : "Near limit"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      ),
    },
    upcoming_recurring: {
      wide: false,
      node: (
        <Card>
          <CardHeader title="Upcoming payments" action={<Link href="/recurring" className="text-label-sm uppercase text-brand-hover underline-offset-4 hover:underline">All</Link>} />
          <CardBody className="space-y-2">
            {upcoming.length === 0 ? (
              <EmptyState icon={<CalendarClock className="h-5 w-5" />} title="Nothing scheduled" description="Add recurring payments to see them here." />
            ) : (
              upcoming.map(({ r, date }) => (
                <div key={r.id} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center text-muted">
                    <CalendarClock className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-fg">{r.name}</p>
                    <p className="text-xs text-muted">{formatDate(date, { withYear: false })}</p>
                  </div>
                  <Money paise={r.type === "income" ? r.amount : -r.amount} tone={r.type === "income" ? "income" : "expense"} className="text-sm font-medium" />
                </div>
              ))
            )}
          </CardBody>
        </Card>
      ),
    },
  };
  const cards = order.filter((k) => widgetKind(k) === "card").flatMap((key, i) => {
    const card = CARDS[key];
    return card?.node ? [{ key, order: i, wide: card.wide, node: card.node }] : [];
  });

  return (
    <>
      {showBalance && <BalanceHero balance={a.totalBalance} />}

      {/* Number tiles, in the order chosen in Settings. */}
      {tiles.length > 0 && <div className="grid shrink-0 grid-cols-3 gap-2 pb-0.5 pr-0.5 md:gap-3">{tiles}</div>}

      {/* Cards, in the order chosen in Settings: one column on phones, two from
          `lg` up, where the wide ones (the charts) span both. */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-[clamp(6px,1.2dvh,12px)] md:flex-none md:grid md:grid-cols-2 md:items-start md:gap-5">
        {cards.map((c) => (
          <div key={c.key} className={cn("flex min-w-0 flex-col md:block", c.key === "recent_transactions" && "min-h-0 flex-1", c.wide && "md:col-span-2")}>{c.node}</div>
        ))}
      </div>
    </>
  );
}

function SavingsRateCard({ rate, delta }: { rate: number; delta: number | null }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-sm [container-type:inline-size]">
      <p className="text-label-sm uppercase text-muted">Savings rate</p>
      <p className="mt-2 whitespace-nowrap font-bold tracking-tight text-fg text-[clamp(1rem,10.5cqi,1.55rem)]">
        {formatPercent(rate)}
      </p>
      <p className="mt-1.5 text-label-sm uppercase text-faint">of income saved</p>
    </div>
  );
}

function BudgetRemainingCard({ remaining, limit }: { remaining: number; limit: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-sm [container-type:inline-size]">
      <p className="text-label-sm uppercase text-muted">Budget left</p>
      <div className="mt-2">
        {limit > 0 ? (
          <Money
            paise={remaining}
            tone={remaining >= 0 ? "income" : "expense"}
            className="whitespace-nowrap font-bold tracking-tight text-[clamp(1rem,10.5cqi,1.55rem)]"
          />
        ) : (
          <span className="font-bold text-faint text-[clamp(1rem,10.5cqi,1.55rem)]">—</span>
        )}
      </div>
      <p className="mt-1.5 flex items-center gap-1 text-label-sm uppercase text-faint">
        {limit > 0 ? `of ${formatINR(limit)}` : "no budget set"}
        <Link href="/budgets" className="text-brand-hover hover:underline">
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </p>
    </div>
  );
}

function greeting() {
  const h = zonedParts(new Date()).hour;
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
