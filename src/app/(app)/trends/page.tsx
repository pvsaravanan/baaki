"use client";
import { Suspense } from "react";
import { usePageData } from "@/lib/local-api";
import { useMonthParam } from "@/components/app/use-month-param";
import { TrendsView } from "@/components/app/trends-view";
import { ScreenData } from "@/components/app/screen-data";

export default function TrendsPage() {
  return (
    <Suspense>
      <Trends />
    </Suspense>
  );
}

function Trends() {
  const { m, monthKey, isCurrent } = useMonthParam();
  const { data, error } = usePageData("trends", { m });
  return (
    <ScreenData data={data} error={error}>
      {(d) => <TrendsView monthKey={monthKey} isCurrent={isCurrent} {...d} />}
    </ScreenData>
  );
}
