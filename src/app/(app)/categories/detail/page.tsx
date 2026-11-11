"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { usePageData } from "@/lib/local-api";
import { useMonthParam } from "@/components/app/use-month-param";
import { MonthNav } from "@/components/app/month-nav";
import { TopbarSlot } from "@/components/app/topbar-slot";
import { MonthContent, MonthScope } from "@/components/app/month-scope";
import { CategoryDetailView } from "@/components/app/category-detail-view";
import { ScreenData } from "@/components/app/screen-data";
import { NotFoundScreen } from "@/components/app/not-found-screen";

/** One category: `/categories/detail?id=…` (a query param, since the app is built ahead of time). */
export default function CategoryDetailPage() {
  return (
    <Suspense>
      <CategoryDetail />
    </Suspense>
  );
}

function CategoryDetail() {
  const id = useSearchParams().get("id") ?? "";
  const { m, monthKey, isCurrent } = useMonthParam();
  const { data, error, isStale } = usePageData("category", { id, m });
  return (
    <MonthScope monthKey={m} loading={isStale}>
      <TopbarSlot>
        <MonthNav monthKey={monthKey} isCurrent={isCurrent} bar />
      </TopbarSlot>
      <MonthContent>
        <ScreenData data={data} error={error}>
          {(d) =>
            d.category && d.detail ? (
              <CategoryDetailView category={d.category} detail={d.detail} monthKey={monthKey} />
            ) : (
              <NotFoundScreen what="category" backHref="/categories" />
            )
          }
        </ScreenData>
      </MonthContent>
    </MonthScope>
  );
}
