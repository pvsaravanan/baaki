"use client";
import { Card, CardBody, CardHeader } from "./report-card";
import { Money } from "@/components/money";
import { IncomeExpenseBars } from "@/components/charts/chart-kit";
import { DistributionTiles, lastSixMonths, type ReportsAnalytics } from "./shared";

export function CashFlowReport({ a }: { a: ReportsAnalytics }) {
  const months = lastSixMonths(a);
  const nets = months.map((m) => m.income - m.expense);
  return (
    <div className="space-y-5">
      <DistributionTiles values={nets} unit="month" />

      <Card>
        <CardHeader title="Income vs Expenses" subtitle="Last 6 months" />
        <CardBody className="pt-2">
          <IncomeExpenseBars data={months} rounded />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Cash Flow" subtitle="Income, expenses and net by month" />
        <CardBody className="px-0 py-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-border/15 text-left text-xs text-muted">
                  <th className="px-3 py-2.5 sm:px-5 font-medium">Month</th>
                  <th className="px-1.5 py-2.5 sm:px-3 text-right font-medium">Income</th>
                  <th className="px-1.5 py-2.5 sm:px-3 text-right font-medium">Expenses</th>
                  <th className="px-3 py-2.5 sm:px-5 text-right font-medium">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/15">
                {months.map((m) => {
                  const net = m.income - m.expense;
                  return (
                    <tr key={m.label}>
                      <td className="px-3 py-2.5 sm:px-5 text-fg">{m.label}</td>
                      <td className="px-1.5 py-2.5 sm:px-3 text-right">
                        <Money paise={m.income} tone="income" />
                      </td>
                      <td className="px-1.5 py-2.5 sm:px-3 text-right">
                        <Money paise={m.expense} tone="expense" />
                      </td>
                      <td className="px-3 py-2.5 sm:px-5 text-right">
                        <Money paise={net} tone={net >= 0 ? "income" : "expense"} className="font-medium" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
