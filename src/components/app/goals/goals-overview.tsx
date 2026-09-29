"use client";
import { useEffect, useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { SectionIcon } from "../section-icon";
import { useToast } from "@/components/ui/toast";
import { useAppData } from "../app-data";
import { GoalForm, type GoalsResponse } from "../goal-form";
import { GoalCard } from "./goal-card";
import { AllocationModal } from "./allocation-modal";
import { MoneyStanding, ShortfallBanner } from "./money-standing";
import type { GoalDTO, GoalsSummaryDTO } from "@/lib/types";
import { cn } from "@/lib/cn";

export function GoalsOverview({ goals: initialGoals, summary: initialSummary }: { goals: GoalDTO[]; summary: GoalsSummaryDTO }) {
  const { refresh } = useAppData();
  const toast = useToast();
  const [goals, setGoals] = useState(initialGoals);
  const [summary, setSummary] = useState(initialSummary);
  const [formOpen, setFormOpen] = useState(false);
  const [formBusy, setFormBusy] = useState(false);
  const [allocating, setAllocating] = useState<GoalDTO | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  // Keep local state in sync with fresh server data after refresh().
  useEffect(() => setGoals(initialGoals), [initialGoals]);
  useEffect(() => setSummary(initialSummary), [initialSummary]);

  function apply(res: GoalsResponse) {
    setGoals(res.goals);
    setSummary(res.summary);
    refresh();
  }

  const inProgress = goals.filter((g) => g.status === "active");
  const completed = goals.filter((g) => g.status === "achieved");
  const archived = goals.filter((g) => g.status === "archived");
  const current = [...inProgress, ...completed];

  const newGoalModal = (
    <Modal
      open={formOpen}
      onClose={() => setFormOpen(false)}
      title="New goal"
      description="Give some of your money a purpose. You'll allocate to it next — nothing leaves your accounts."
      busy={formBusy}
    >
      <GoalForm
        onSaved={(res) => {
          apply(res);
          setFormOpen(false);
          toast.success("Goal created");
        }}
        onCancel={() => setFormOpen(false)}
        onBusyChange={setFormBusy}
      />
    </Modal>
  );

  if (goals.length === 0) {
    return (
      <div className="space-y-5">
        <MoneyStanding summary={summary} activeGoals={0} />
        <Card>
          <EmptyState
            illustration={<SectionIcon section="goals" size={56} />}
            title="No goals yet"
            description="Your money can stay in your account while you give it a purpose — a trip, an emergency fund, a new laptop. Allocating to a goal never spends or moves money."
            action={
              <Button onClick={() => setFormOpen(true)}>
                <Plus className="h-4 w-4" aria-hidden />
                New goal
              </Button>
            }
          />
        </Card>
        {newGoalModal}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-body-sm text-muted">Your money stays in your accounts — goals just give it a purpose.</p>
        <Button onClick={() => setFormOpen(true)} className="shrink-0">
          <Plus className="h-4 w-4" aria-hidden />
          New goal
        </Button>
      </div>

      <MoneyStanding summary={summary} activeGoals={inProgress.length} />
      <ShortfallBanner summary={summary} goals={goals} onResolved={apply} />

      {current.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {current.map((g) => (
            <GoalCard key={g.id} goal={g} onAllocate={() => setAllocating(g)} />
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            title="No active goals"
            description="Every goal is archived. Restore one from below, or start a new goal."
          />
        </Card>
      )}

      {archived.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            aria-expanded={showArchived}
            className="flex items-center gap-2 text-label-md uppercase text-muted hover:text-fg"
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", showArchived && "rotate-180")} aria-hidden />
            Archived ({archived.length})
          </button>
          {showArchived && (
            <>
              <p className="mt-2 text-xs text-muted">Archived goals keep their history, but their money counts as available.</p>
              <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {archived.map((g) => (
                  <GoalCard key={g.id} goal={g} />
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {newGoalModal}
      {allocating && (
        <AllocationModal
          key={allocating.id}
          goal={goals.find((g) => g.id === allocating.id) ?? allocating}
          mode="allocate"
          summary={summary}
          onClose={() => setAllocating(null)}
          onDone={(res, message) => {
            apply(res);
            setAllocating(null);
            toast.success(message);
          }}
        />
      )}
    </div>
  );
}
