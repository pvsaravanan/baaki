"use client";
import { usePageData } from "@/lib/local-api";
import { PageHeader } from "@/components/app/page-header";
import { GoalsOverview } from "@/components/app/goals/goals-overview";
import { GoalsSkeleton } from "@/components/app/goals/goals-skeleton";
import { ScreenData } from "@/components/app/screen-data";

export default function GoalsPage() {
  const { data, error } = usePageData("goals");
  return (
    <ScreenData data={data} error={error} skeleton={<GoalsSkeleton />}>
      {(d) => (
        <div>
          <PageHeader title="Goals" description="Give your money a purpose without spending or moving it." />
          <GoalsOverview goals={d.goals} summary={d.summary} />
        </div>
      )}
    </ScreenData>
  );
}
