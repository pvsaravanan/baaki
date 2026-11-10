"use client";
import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { usePageData } from "@/lib/local-api";
import { monthLabel } from "@/lib/dates";
import { parseReportPeriod, REPORT_PERIODS, type PresetPeriod, type ReportPeriod } from "@/lib/report-period";
import { useMonthParam } from "@/components/app/use-month-param";
import { MonthNav } from "@/components/app/month-nav";
import { TopbarSlot } from "@/components/app/topbar-slot";
import { MonthContent, MonthScope, useMonthScope } from "@/components/app/month-scope";
import { parseReportType, ReportsView } from "@/components/app/reports-view";
import { ChipRow } from "@/components/app/reports/chip-row";
import { ExportButton } from "@/components/app/reports/export-button";
import { PeriodOverview } from "@/components/app/reports/period-overview";
import { MonthChip, RangeChip } from "@/components/app/reports/period-picker";
import { ScreenData } from "@/components/app/screen-data";

export default function ReportsPage() {
  return (
    <Suspense>
      <Reports />
    </Suspense>
  );
}

function Reports() {
  // `?report=` opens the detailed monthly reports; otherwise it's the overview.
  const report = useSearchParams().get("report");
  return report ? <DetailedReports report={report} /> : <Overview />;
}

function Overview() {
  const period = parseReportPeriod(useSearchParams().get("period"));
  const { data, error, isStale } = usePageData("reportsOverview", { period });
  return (
    <MonthScope monthKey={period} loading={isStale}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-headline-md text-fg sm:text-headline-lg">Reports</h1>
          <p className="mt-1 text-body-sm text-muted">Understand your spending patterns.</p>
        </div>
        <ExportButton />
      </div>
      <div className="mb-4">
        <PeriodChips period={period} />
      </div>
      <MonthContent>
        <ScreenData data={data} error={error}>
          {(d) => <PeriodOverview key={period} report={d.report} />}
        </ScreenData>
      </MonthContent>
    </MonthScope>
  );
}

function PeriodChips({ period }: { period: ReportPeriod }) {
  const scope = useMonthScope();
  const pathname = usePathname();
  // Shows the chip you tapped at once, while its numbers load.
  const shown = parseReportPeriod(scope?.targetKey ?? period);
  const go = (value: ReportPeriod) => scope?.navigate(`${pathname}?period=${value}`, value);
  return (
    <ChipRow
      label="Report period"
      options={REPORT_PERIODS}
      value={REPORT_PERIODS.some((p) => p.value === shown) ? (shown as PresetPeriod) : null}
      onChange={go}
    >
      <MonthChip period={shown} onPick={go} />
      <RangeChip period={shown} onPick={go} />
    </ChipRow>
  );
}

function DetailedReports({ report }: { report: string }) {
  const { m, monthKey, isCurrent } = useMonthParam();
  const { data, error, isStale } = usePageData("reports", { m });
  const router = useRouter();
  const label = monthLabel(monthKey);
  return (
    <MonthScope monthKey={m} loading={isStale}>
      <div className="mb-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back to Reports"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border/25 text-fg transition-colors active:bg-surface-2 print:hidden"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-headline-sm tracking-normal text-fg sm:text-headline-md">Detailed Reports</h1>
          <p className="mt-0.5 text-xs text-muted sm:text-body-sm">Breakdown for {label}.</p>
        </div>
        <ExportButton />
      </div>
      <TopbarSlot>
        <MonthNav monthKey={monthKey} isCurrent={isCurrent} bar />
      </TopbarSlot>
      <MonthContent>
        <ScreenData data={data} error={error}>
          {(d) => <ReportsView analytics={d.analytics} monthLabel={label} perAccount={d.perAccount} initialReport={parseReportType(report)} />}
        </ScreenData>
      </MonthContent>
    </MonthScope>
  );
}
