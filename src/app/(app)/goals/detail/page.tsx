"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { usePageData } from "@/lib/local-api";
import { GoalDetail } from "@/components/app/goals/goal-detail";
import { ScreenData } from "@/components/app/screen-data";
import { NotFoundScreen } from "@/components/app/not-found-screen";

/** One goal: `/goals/detail?id=…` (a query param, since the app is built ahead of time). */
export default function GoalPage() {
  return (
    <Suspense>
      <Goal />
    </Suspense>
  );
}

function Goal() {
  const id = useSearchParams().get("id") ?? "";
  const { data, error } = usePageData("goals");
  return (
    <ScreenData data={data} error={error}>
      {(d) =>
        d.goals.some((g) => g.id === id) ? (
          <GoalDetail goalId={id} goals={d.goals} summary={d.summary} />
        ) : (
          <NotFoundScreen what="goal" backHref="/goals" />
        )
      }
    </ScreenData>
  );
}
