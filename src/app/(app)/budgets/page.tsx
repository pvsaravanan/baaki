"use client";
import { Suspense } from "react";
import { usePageData } from "@/lib/local-api";
import { useMonthParam } from "@/components/app/use-month-param";
import { PageHeader } from "@/components/app/page-header";
import { MonthNav } from "@/components/app/month-nav";
import { MonthContent, MonthScope } from "@/components/app/month-scope";
import { BudgetsView } from "@/components/app/budgets-view";
import { ScreenData } from "@/components/app/screen-data";

export default function BudgetsPage() {
  return (
    <Suspense>
      <Budgets />
    </Suspense>
  );
}

function Budgets() {
  const { m, monthKey, isCurrent } = useMonthParam();
  const { data, error, isStale } = usePageData("budgets", { m });
  return (
    <MonthScope monthKey={m} loading={isStale}>
      <PageHeader
        title="Budgets"
        description="Set monthly limits and track your spending against them."
        actions={<MonthNav monthKey={monthKey} isCurrent={isCurrent} className="w-full sm:w-auto" />}
      />
      <MonthContent>
        <ScreenData data={data} error={error}>
          {(d) => <BudgetsView budget={d.budget} categories={d.categories} monthKey={monthKey} />}
        </ScreenData>
      </MonthContent>
    </MonthScope>
  );
}
