import { requireUserOrRedirect } from "@/lib/auth";
import { loadGoalsOverview } from "@/lib/goals-service";
import { PageHeader } from "@/components/app/page-header";
import { GoalsOverview } from "@/components/app/goals/goals-overview";

export const metadata = { title: "Goals · baaki" };

export default async function GoalsPage() {
  const user = await requireUserOrRedirect();
  const { goals, summary } = await loadGoalsOverview(user.id);

  return (
    <div>
      <PageHeader title="Goals" description="Give your money a purpose without spending or moving it." />
      <GoalsOverview goals={goals} summary={summary} />
    </div>
  );
}
