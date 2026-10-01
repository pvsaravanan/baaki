"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { usePageData } from "@/lib/local-api";
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
  const { data, error } = usePageData("category", { id });
  return (
    <ScreenData data={data} error={error}>
      {(d) =>
        d.category && d.detail ? (
          <CategoryDetailView category={d.category} detail={d.detail} />
        ) : (
          <NotFoundScreen what="category" backHref="/categories" />
        )
      }
    </ScreenData>
  );
}
