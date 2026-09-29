import { requireUserOrRedirect } from "@/lib/auth";
import { getMonthlyAnalytics } from "@/lib/analytics";
import { loadCalcTxns } from "@/lib/queries";
import { filterRange } from "@/lib/calculations";
import { monthKeyOf, monthKeyString, monthLabel, monthRange, parseMonthKey, toISODate, type MonthKey } from "@/lib/dates";
import { PageHeader } from "@/components/app/page-header";
import { MonthNav } from "@/components/app/month-nav";
import { MonthContent, MonthScope } from "@/components/app/month-scope";
import { ReportsView, type PerAccountRow, type ReportsAnalytics } from "@/components/app/reports-view";

export const metadata = { title: "Reports · baaki" };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const user = await requireUserOrRedirect();
  const { m } = await searchParams;
  const nowKey = monthKeyOf(new Date());
  const monthKey: MonthKey = parseMonthKey(m) ?? nowKey;
  const isCurrent = monthKey.year === nowKey.year && monthKey.month === nowKey.month;

  const txns = await loadCalcTxns(user.id);
  const analytics = await getMonthlyAnalytics(user.id, monthKey, txns);
  const label = monthLabel(monthKey);

  // Per-account activity for the selected month.
  const { start, end } = monthRange(monthKey);
  const monthTxns = filterRange(txns, start, end);
  const byAccount = new Map<string, PerAccountRow>();
  for (const t of monthTxns) {
    const row = byAccount.get(t.accountId) ?? { accountId: t.accountId, expense: 0, income: 0, count: 0 };
    row.count += 1;
    if (t.type === "expense") row.expense += t.amount;
    else if (t.type === "income") row.income += t.amount;
    byAccount.set(t.accountId, row);
  }
  const perAccount = [...byAccount.values()];

  // Serialize Dates for the client component.
  const serialized: ReportsAnalytics = {
    ...analytics,
    largestExpense: analytics.largestExpense
      ? { ...analytics.largestExpense, date: toISODate(analytics.largestExpense.date) }
      : null,
  };

  return (
    <MonthScope monthKey={monthKeyString(monthKey)}>
      <PageHeader
        title="Reports"
        description={`Financial breakdown for ${label}.`}
        actions={<MonthNav monthKey={monthKey} isCurrent={isCurrent} className="w-full sm:w-auto" />}
      />
      <MonthContent>
        <ReportsView analytics={serialized} monthLabel={label} perAccount={perAccount} />
      </MonthContent>
    </MonthScope>
  );
}
