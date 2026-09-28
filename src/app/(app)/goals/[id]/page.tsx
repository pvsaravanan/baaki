import { notFound } from "next/navigation";
import { requireUserOrRedirect } from "@/lib/auth";
import { loadGoalsOverview } from "@/lib/goals-service";
import { GoalDetail } from "@/components/app/goals/goal-detail";

export const metadata = { title: "Goal · baaki" };

export default async function GoalPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUserOrRedirect();
  const { id } = await params;
  // The whole overview, not just this goal: "available" depends on every
  // goal's allocation.
  const { goals, summary } = await loadGoalsOverview(user.id);
  if (!goals.some((g) => g.id === id)) notFound();

  return <GoalDetail goalId={id} goals={goals} summary={summary} />;
}
