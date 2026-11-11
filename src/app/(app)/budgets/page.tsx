"use client";
import { Suspense, useState } from "react";
import { usePageData } from "@/lib/local-api";
import { useMonthParam } from "@/components/app/use-month-param";
import { MonthNav } from "@/components/app/month-nav";
import { TopbarSlot } from "@/components/app/topbar-slot";
import { MonthContent, MonthScope } from "@/components/app/month-scope";
import { BudgetsView } from "@/components/app/budgets-view";
import { ScreenData } from "@/components/app/screen-data";
import { BackButton } from "@/components/app/back-button";
import { BudgetArt } from "@/components/app/page-illustrations";

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
      <div className="mb-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <BackButton />
            <h1 className="text-headline-md text-fg sm:text-headline-lg">Budget</h1>
          </div>
          <p className="mt-1 text-body-sm text-muted">Plan, track and stay in control.</p>
        </div>
        <BudgetArt />
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
