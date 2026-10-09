"use client";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { StatCard } from "@/components/app/stat-card";
import { SectionIcon } from "@/components/app/section-icon";
import { IncomeExpenseBars, TrendArea } from "@/components/charts/chart-kit";
import { formatPercent } from "@/lib/money";
import { dailySeries, Tile, type ReportsAnalytics } from "./shared";

export function OverviewReport({ a, label }: { a: ReportsAnalytics; label: string }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Income" value={a.current.income} tone="income" delta={a.deltas.income} deltaGood="up" />
        <StatCard label="Expenses" value={a.current.effectiveExpense} tone="expense" delta={a.deltas.expense} deltaGood="down" />
        <StatCard label="Net" value={a.current.net} tone={a.current.net >= 0 ? "income" : "expense"} delta={a.deltas.net} deltaGood="up" />
        <Tile label="Savings rate" hint="of income saved">
          {formatPercent(a.current.savingsRate)}
        </Tile>
      </div>

      <Card>
        <CardHeader title="Income vs expenses" subtitle="Last 6 months" />
        <CardBody className="pt-2">
          <IncomeExpenseBars data={a.incomeExpenseTrend} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Daily spending" subtitle={label} />
        <CardBody className="pt-2">
          {a.transactionCount === 0 ? (
            <EmptyState illustration={<SectionIcon section="reports" size={56} />} title="No activity this period" description="Charts appear once you record transactions." />
          ) : (
            <TrendArea data={dailySeries(a, "expense")} name="Spent" />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
