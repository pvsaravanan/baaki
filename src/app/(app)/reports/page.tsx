"use client";
import { Suspense } from "react";
import { usePageData } from "@/lib/local-api";
import { monthLabel } from "@/lib/dates";
import { useMonthParam } from "@/components/app/use-month-param";
import { PageHeader } from "@/components/app/page-header";
import { MonthNav } from "@/components/app/month-nav";
import { MonthContent, MonthScope } from "@/components/app/month-scope";
import { ReportsView } from "@/components/app/reports-view";
import { ScreenData } from "@/components/app/screen-data";

export default function ReportsPage() {
  return (
    <Suspense>
      <Reports />
    </Suspense>
  );
}

function Reports() {
  const { m, monthKey, isCurrent } = useMonthParam();
  const { data, error, isStale } = usePageData("reports", { m });
  const label = monthLabel(monthKey);
  return (
    <MonthScope monthKey={m} loading={isStale}>
      <PageHeader
        title="Reports"
        description={`Financial breakdown for ${label}.`}
        actions={<MonthNav monthKey={monthKey} isCurrent={isCurrent} className="w-full sm:w-auto" />}
      />
      <MonthContent>
        <ScreenData data={data} error={error}>
          {(d) => <ReportsView analytics={d.analytics} monthLabel={label} perAccount={d.perAccount} />}
        </ScreenData>
      </MonthContent>
    </MonthScope>
  );
}
