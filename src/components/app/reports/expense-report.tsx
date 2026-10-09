"use client";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { Money } from "@/components/money";
import { StatCard } from "@/components/app/stat-card";
import { SectionIcon } from "@/components/app/section-icon";
import { TrendArea } from "@/components/charts/chart-kit";
import { CategoryReport } from "./category-report";
import { dailySeries, Tile, type ReportsAnalytics } from "./shared";

export function ExpenseReport({ a }: { a: ReportsAnalytics }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Expenses this month" value={a.current.effectiveExpense} tone="expense" delta={a.deltas.expense} deltaGood="down" />
        <Tile label="Avg daily spend">
          <Money paise={a.avgDailySpend} tone="default" />
        </Tile>
        <Tile label="Subscriptions">
          <Money paise={a.subscriptionSpend} tone="default" />
        </Tile>
        <Tile label="Largest expense" hint={a.largestExpense?.description}>
          {a.largestExpense ? <Money paise={a.largestExpense.amount} tone="expense" /> : "—"}
        </Tile>
      </div>

      <Card>
        <CardHeader title="Daily spending" subtitle="This month" />
        <CardBody className="pt-2">
          {a.transactionCount === 0 ? (
            <EmptyState illustration={<SectionIcon section="reports" size={56} />} title="No spending this period" description="Charts appear once you record expenses." />
          ) : (
            <TrendArea data={dailySeries(a, "expense")} name="Spent" />
          )}
        </CardBody>
      </Card>

      <CategoryReport a={a} title="Expenses by category" />
    </div>
  );
}
