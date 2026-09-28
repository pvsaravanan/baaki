"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, ArrowLeft, MinusCircle, Pencil, PlusCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, Progress } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { Money } from "@/components/money";
import { CategoryIcon } from "../category-icon";
import { resolveGoalIcon } from "@/lib/category-icons";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import { useAppData } from "../app-data";
import { GoalForm, type GoalsResponse } from "../goal-form";
import { GoalStatusBadge } from "./goal-card";
import { AllocationModal, type AllocationMode } from "./allocation-modal";
import { ShortfallBanner } from "./money-standing";
import { ApiError, apiDelete, apiPatch } from "@/lib/http";
import { formatINR, formatPercent } from "@/lib/money";
import { formatDate, fromISODate, monthName, zonedParts } from "@/lib/dates";
import { monthlyContributionNeeded } from "@/lib/calculations";
import { estimatedCompletion, goalProgress, monthlyAllocationPace } from "@/lib/goal-allocation";
import type { GoalDTO, GoalsSummaryDTO } from "@/lib/types";

function monthYear(date: Date): string {
  const { year, month } = zonedParts(date);
  return `${monthName(month)} ${year}`;
}

export function GoalDetail({
  goalId,
  goals: initialGoals,
  summary: initialSummary,
}: {
  goalId: string;
  goals: GoalDTO[];
  summary: GoalsSummaryDTO;
}) {
  const { refresh } = useAppData();
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const [goals, setGoals] = useState(initialGoals);
  const [summary, setSummary] = useState(initialSummary);
  const [modal, setModal] = useState<AllocationMode | null>(null);
  const [editing, setEditing] = useState(false);
  const [formBusy, setFormBusy] = useState(false);
  const [busy, setBusy] = useState<"archive" | "delete" | null>(null);

  useEffect(() => setGoals(initialGoals), [initialGoals]);
  useEffect(() => setSummary(initialSummary), [initialSummary]);

  const goal = goals.find((g) => g.id === goalId);
  if (!goal) {
    return (
      <Card>
        <EmptyState title="Goal not found" description="It may have been deleted." action={<Link href="/goals" className="text-label-md uppercase text-accent underline-offset-4 hover:underline">All goals</Link>} />
      </Card>
    );
  }

  function apply(res: GoalsResponse) {
    setGoals(res.goals);
    setSummary(res.summary);
    refresh();
  }

  const today = new Date();
  const pct = goalProgress(goal.allocatedAmount, goal.targetAmount);
  const remaining = Math.max(0, goal.targetAmount - goal.allocatedAmount);
  const completed = goal.status === "achieved";
  const archived = goal.status === "archived";
  const targetDate = goal.targetDate ? fromISODate(goal.targetDate) : null;
  const history = goal.allocations.map((a) => ({ ...a, date: new Date(a.at) }));
  const pace = monthlyAllocationPace(history, today);
  const eta = estimatedCompletion(remaining, pace, today);
  const needed = targetDate ? monthlyContributionNeeded(goal.targetAmount, goal.allocatedAmount, today, targetDate) : 0;
  const targetPassed = targetDate ? targetDate.getTime() < today.getTime() : false;

  async function toggleArchive() {
    const g = goal!;
    if (!archived) {
      const ok = await confirm({
        title: "Archive goal?",
        message:
          g.allocatedAmount > 0
            ? `The ${formatINR(g.allocatedAmount)} allocated to "${g.name}" becomes available again while it's archived. Its history is kept, and you can restore it later.`
            : `"${g.name}" moves to Archived. You can restore it later.`,
        confirmLabel: "Archive",
      });
      if (!ok) return;
    }
    setBusy("archive");
    try {
      const res = await apiPatch<GoalsResponse>(`/api/goals/${g.id}`, { status: archived ? "active" : "archived" });
      apply(res);
      toast.success(archived ? "Goal restored" : "Goal archived");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update the goal.");
    } finally {
      setBusy(null);
    }
  }

  async function onDelete() {
    const g = goal!;
    const ok = await confirm({
      title: "Delete goal?",
      message:
        g.allocatedAmount > 0 && g.status !== "archived"
          ? `The ${formatINR(g.allocatedAmount)} allocated to "${g.name}" becomes available again, and its allocation history is removed. Your account balances don't change.`
          : `"${g.name}" and its allocation history will be permanently removed.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    setBusy("delete");
    try {
      await apiDelete<GoalsResponse>(`/api/goals/${g.id}`);
      toast.success("Goal deleted");
      router.push("/goals");
      refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not delete the goal.");
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <Link href="/goals" className="inline-flex items-center gap-1.5 text-label-md uppercase text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        All goals
      </Link>

      <ShortfallBanner summary={summary} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Progress */}
        <Card>
          <CardBody className="space-y-5">
            <div className="flex items-start gap-3">
              <CategoryIcon icon={resolveGoalIcon(goal.icon)} size={48} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-headline-sm text-fg">{goal.name}</h2>
                  <GoalStatusBadge status={goal.status} />
                </div>
                <p className="mt-0.5 text-xs text-muted">Created {formatDate(new Date(goal.createdAt))}</p>
              </div>
            </div>

            <div>
              <Money paise={goal.allocatedAmount} tone="default" className="text-headline-lg" />
              <p className="mt-1 text-body-sm text-muted">
                allocated of <Money paise={goal.targetAmount} tone="default" className="font-bold" /> target
              </p>
            </div>

            <div className="space-y-2">
              <Progress value={pct} tone={completed ? "income" : "brand"} />
              <div className="flex justify-between text-label-md uppercase tabular-nums text-muted">
                <span>{formatPercent(pct, 0)} complete</span>
                <span>{completed ? "Goal completed" : <><Money paise={remaining} tone="default" /> remaining</>}</span>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-3 border-t border-border pt-4 text-body-sm">
              <div>
                <dt className="text-label-sm uppercase text-muted">Target date</dt>
                <dd className="mt-1 text-fg">{targetDate ? formatDate(targetDate) : "None set"}</dd>
              </div>
              <div>
                <dt className="text-label-sm uppercase text-muted">Available to allocate</dt>
                <dd className="mt-1">
                  <Money paise={summary.available} tone={summary.available < 0 ? "expense" : "default"} />
                </dd>
              </div>
            </dl>

            <div className="flex flex-wrap gap-2">
              {!archived && !completed && (
                <Button onClick={() => setModal("allocate")}>
                  <PlusCircle className="h-4 w-4" aria-hidden />
                  Allocate money
                </Button>
              )}
              {goal.allocatedAmount > 0 && !archived && (
                <Button variant="secondary" onClick={() => setModal("remove")}>
                  <MinusCircle className="h-4 w-4" aria-hidden />
                  Remove allocation
                </Button>
              )}
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" aria-hidden />
                Edit
              </Button>
              <Button variant="outline" onClick={toggleArchive} loading={busy === "archive"} disabled={!!busy}>
                {archived ? <ArchiveRestore className="h-4 w-4" aria-hidden /> : <Archive className="h-4 w-4" aria-hidden />}
                {archived ? "Restore" : "Archive"}
              </Button>
              <Button variant="ghost" onClick={onDelete} loading={busy === "delete"} disabled={!!busy}>
                <Trash2 className="h-4 w-4" aria-hidden />
                Delete
              </Button>
            </div>
            {archived && (
              <p className="text-xs text-muted">
                This goal is archived: its allocation counts as available. Restore it to set that money aside again.
              </p>
            )}
          </CardBody>
        </Card>

        {/* Insights — informational only; nothing is moved automatically. */}
        {!completed && !archived && (
          <Card>
            <CardHeader title="Insights" subtitle="Estimates only — nothing is allocated automatically." />
            <CardBody className="space-y-4 text-body-sm">
              {targetDate &&
                (targetPassed ? (
                  <p className="text-muted">The target date has passed. Edit the goal to set a new one.</p>
                ) : (
                  <div>
                    <p className="text-label-sm uppercase text-muted">To reach it by {formatDate(targetDate, { withYear: false })}</p>
                    <p className="mt-1 text-fg">
                      Allocate about <Money paise={needed} tone="default" className="font-bold" />/month
                    </p>
                  </div>
                ))}
              {pace ? (
                <>
                  <div>
                    <p className="text-label-sm uppercase text-muted">Your recent pace</p>
                    <p className="mt-1 text-fg"><Money paise={pace} tone="default" className="font-bold" />/month</p>
                  </div>
                  {eta && (
                    <div>
                      <p className="text-label-sm uppercase text-muted">Estimated completion</p>
                      <p className="mt-1 text-fg">
                        {monthYear(eta)}
                        {targetDate && !targetPassed && (
                          <span className={eta.getTime() > targetDate.getTime() ? "text-expense" : "text-income"}>
                            {eta.getTime() > targetDate.getTime() ? " · after your target" : " · on track"}
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-muted">
                  Keep allocating for a few weeks and baaki will estimate when you&apos;ll reach this goal.
                </p>
              )}
            </CardBody>
          </Card>
        )}
      </div>

      {/* Allocation history */}
      <Card>
        <CardHeader title="Allocation history" subtitle="Money set aside for this goal and taken back. None of it was spent or moved." />
        <CardBody>
          {history.length === 0 ? (
            <p className="text-body-sm text-muted">Nothing allocated yet.</p>
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {history.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-body-sm text-fg">{h.amount > 0 ? "Allocated" : "Removed"}</p>
                    <p className="truncate text-xs text-muted">
                      {formatDate(h.date)}
                      {h.note ? ` · ${h.note}` : ""}
                    </p>
                  </div>
                  {/* Neutral tones on purpose: an allocation isn't income or spending. */}
                  <Money
                    paise={h.amount}
                    sign
                    tone={h.amount > 0 ? "default" : "muted"}
                    className="shrink-0 text-body-sm font-bold tabular-nums"
                  />
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {modal && (
        <AllocationModal
          goal={goal}
          mode={modal}
          summary={summary}
          onClose={() => setModal(null)}
          onDone={(res, message) => {
            apply(res);
            setModal(null);
            toast.success(message);
          }}
        />
      )}

      <Modal open={editing} onClose={() => setEditing(false)} title="Edit goal" busy={formBusy}>
        <GoalForm
          initial={goal}
          onSaved={(res) => {
            apply(res);
            setEditing(false);
            toast.success("Goal updated");
          }}
          onCancel={() => setEditing(false)}
          onBusyChange={setFormBusy}
        />
      </Modal>
    </div>
  );
}
