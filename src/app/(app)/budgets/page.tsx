import { requireUserOrRedirect } from "@/lib/auth";
import { getMonthlyAnalytics } from "@/lib/analytics";
import { loadCategories } from "@/lib/queries";
import { monthKeyOf, monthKeyString, parseMonthKey, type MonthKey } from "@/lib/dates";
import { PageHeader } from "@/components/app/page-header";
import { MonthNav } from "@/components/app/month-nav";
import { MonthContent, MonthScope } from "@/components/app/month-scope";
import { BudgetsView } from "@/components/app/budgets-view";

export const metadata = { title: "Budgets · baaki" };

export default async function BudgetsPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const user = await requireUserOrRedirect();
  const { m } = await searchParams;
  const nowKey = monthKeyOf(new Date());
  const monthKey: MonthKey = parseMonthKey(m) ?? nowKey;
  const isCurrent = monthKey.year === nowKey.year && monthKey.month === nowKey.month;

  const [analytics, categories] = await Promise.all([
    getMonthlyAnalytics(user.id, monthKey),
    loadCategories(user.id),
  ]);

  return (
    <MonthScope monthKey={monthKeyString(monthKey)}>
      <PageHeader
        title="Budgets"
        description="Set monthly limits and track your spending against them."
        actions={<MonthNav monthKey={monthKey} isCurrent={isCurrent} className="w-full sm:w-auto" />}
      />
      <MonthContent>
        <BudgetsView budget={analytics.budget} categories={categories} monthKey={monthKey} />
      </MonthContent>
    </MonthScope>
  );
}
