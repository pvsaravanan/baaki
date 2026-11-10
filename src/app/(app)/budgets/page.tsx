"use client";
import { Suspense, useState } from "react";
import { usePageData } from "@/lib/local-api";
import { useMonthParam } from "@/components/app/use-month-param";
import { MonthNav } from "@/components/app/month-nav";
import { TopbarSlot } from "@/components/app/topbar-slot";
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
  const [editing, setEditing] = useState(false);
  return (
    <MonthScope monthKey={m} loading={isStale}>
      {/* Editing lives in the view: "Set a budget" when empty, "Manage" otherwise. */}
      <div className="mb-4 min-w-0">
        <h1 className="text-headline-md text-fg sm:text-headline-lg">Budget</h1>
        <p className="mt-1 text-body-sm text-muted">Plan, track and stay in control.</p>
      </div>
      <TopbarSlot>
        <MonthNav monthKey={monthKey} isCurrent={isCurrent} monthsAhead={12} bar />
      </TopbarSlot>
      <MonthContent>
        <ScreenData data={data} error={error}>
          {(d) => (
            <BudgetsView
              budget={d.budget}
              categories={d.categories}
              monthKey={monthKey}
              editing={editing}
              onEditingChange={setEditing}
            />
          )}
        </ScreenData>
      </MonthContent>
    </MonthScope>
  );
}
