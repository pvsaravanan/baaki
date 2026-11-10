"use client";
import { Card, CardBody, CardHeader } from "./report-card";
import { Money } from "@/components/money";
import { StatCard } from "@/components/app/stat-card";
import { TrendArea } from "@/components/charts/chart-kit";
import { formatPercent } from "@/lib/money";
import { DistributionTiles, lastSixMonths, Tile, type ReportsAnalytics } from "./shared";

export function IncomeReport({ a }: { a: ReportsAnalytics }) {
  const months = lastSixMonths(a);
  const incomeTrend = months.map((m) => ({ label: m.label, value: m.income }));
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Income this month" value={a.current.income} tone="income" delta={a.deltas.income} deltaGood="up" />
        <StatCard label="Net" value={a.current.net} tone={a.current.net >= 0 ? "income" : "expense"} delta={a.deltas.net} deltaGood="up" />
        <Tile label="Savings rate" hint="of income saved">
          {formatPercent(a.current.savingsRate)}
        </Tile>
        <Tile label="Transactions" hint="this month">
          <span>{a.transactionCount}</span>
        </Tile>
      </div>

      <Card>
        <CardHeader title="Income Trend" subtitle="Last 6 months" />
        <CardBody className="pt-2">
          <TrendArea data={incomeTrend} name="Income" />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Monthly Income" subtitle="Last 6 months" />
        <CardBody className="px-0 py-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-border/15 text-left text-xs text-muted">
                  <th className="px-5 py-2.5 font-medium">Month</th>
                  <th className="px-5 py-2.5 text-right font-medium">Income</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/15">
                {months.map((m) => (
                  <tr key={m.label}>
                    <td className="px-5 py-2.5 text-fg">{m.label}</td>
                    <td className="px-5 py-2.5 text-right">
                      <Money paise={m.income} tone="income" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <DistributionTiles values={months.map((m) => m.income)} unit="month" />
    </div>
  );
}
