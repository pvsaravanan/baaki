"use client";
import { usePageData } from "@/lib/local-api";
import { PageHeader } from "@/components/app/page-header";
import { CategoriesView } from "@/components/app/categories-view";
import { ScreenData } from "@/components/app/screen-data";

export default function CategoriesPage() {
  const { data, error } = usePageData("categories");
  return (
    <div>
      <PageHeader title="Categories" description="Organize spending and income, and set monthly budgets." />
      <ScreenData data={data} error={error}>{(d) => <CategoriesView categories={d.categories} />}</ScreenData>
    </div>
  );
}
