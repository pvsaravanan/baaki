"use client";
import { useState } from "react";
import { Download } from "lucide-react";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toast";
import { downloadFile } from "@/lib/http";
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
  { value: "category", label: "By category" },
  { value: "account", label: "By account" },
  { value: "income", label: "Income" },
  { value: "expense", label: "Expenses" },
  { value: "cashflow", label: "Cash flow" },
];

export function ReportsView({
  analytics,
  monthLabel,
  perAccount,
}: {
  analytics: ReportsAnalytics;
  monthLabel: string;
  perAccount: PerAccountRow[];
}) {
  const [report, setReport] = useState<ReportType>("overview");
  const [downloading, setDownloading] = useState(false);
  const toast = useToast();

  async function handleExport() {
    setDownloading(true);
    await downloadFile("/api/export?format=csv", (message) => toast.error(message));
    setDownloading(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented
          value={report}
          onChange={setReport}
          options={REPORT_OPTIONS}
          size="sm"
          wrap
          className="w-full grid-cols-3 sm:w-[22rem]"
        />
        <button
          type="button"
          onClick={handleExport}
          disabled={downloading}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-none border border-border-strong px-4 text-sm font-medium text-fg transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {downloading ? "Exporting…" : "Export CSV"}
        </button>
      </div>

      {report === "overview" && <OverviewReport a={analytics} label={monthLabel} />}
      {report === "category" && <CategoryReport a={analytics} title="Spending by category" />}
      {report === "account" && <AccountReport perAccount={perAccount} />}
      {report === "income" && <IncomeReport a={analytics} />}
      {report === "expense" && <ExpenseReport a={analytics} />}
      {report === "cashflow" && <CashFlowReport a={analytics} />}
    </div>
  );
}
