"use client";
import { useState } from "react";
import { ChipRow } from "./reports/chip-row";
import { OverviewReport } from "./reports/overview-report";
import { CategoryReport } from "./reports/category-report";
import { AccountReport } from "./reports/account-report";
import { IncomeReport } from "./reports/income-report";
import { ExpenseReport } from "./reports/expense-report";
import { CashFlowReport } from "./reports/cashflow-report";
import type { PerAccountRow, ReportsAnalytics } from "./reports/shared";

export type { PerAccountRow, ReportsAnalytics } from "./reports/shared";

type ReportType = "overview" | "category" | "account" | "income" | "expense" | "cashflow";

const REPORT_OPTIONS: { value: ReportType; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "category", label: "By Category" },
  { value: "account", label: "By Account" },
  { value: "income", label: "Income" },
  { value: "expense", label: "Expenses" },
  { value: "cashflow", label: "Cash Flow" },
];

export function parseReportType(value: string): ReportType {
  return REPORT_OPTIONS.find((o) => o.value === value)?.value ?? "overview";
}

export function ReportsView({
  analytics,
  monthLabel,
  perAccount,
  initialReport = "overview",
}: {
  analytics: ReportsAnalytics;
  monthLabel: string;
  perAccount: PerAccountRow[];
  initialReport?: ReportType;
}) {
  const [report, setReport] = useState<ReportType>(initialReport);

  return (
    <div className="space-y-4">
      <ChipRow label="Report" options={REPORT_OPTIONS} value={report} onChange={setReport} />

      {report === "overview" && <OverviewReport a={analytics} label={monthLabel} />}
      {report === "category" && <CategoryReport a={analytics} title="Spending by Category" />}
      {report === "account" && <AccountReport perAccount={perAccount} />}
      {report === "income" && <IncomeReport a={analytics} />}
      {report === "expense" && <ExpenseReport a={analytics} />}
      {report === "cashflow" && <CashFlowReport a={analytics} />}
    </div>
  );
}
