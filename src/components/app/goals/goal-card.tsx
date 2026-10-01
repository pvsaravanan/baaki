"use client";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Progress } from "@/components/ui/misc";
import { Money } from "@/components/money";
import { CategoryIcon } from "../category-icon";
import { resolveGoalIcon } from "@/lib/category-icons";
import { formatPercent } from "@/lib/money";
import { formatDate, fromISODate } from "@/lib/dates";
import { goalProgress } from "@/lib/goal-allocation";
import type { GoalDTO } from "@/lib/types";
import { cn } from "@/lib/cn";

export function GoalStatusBadge({ status }: { status: GoalDTO["status"] }) {
  if (status === "achieved") return <Badge tone="income">Completed</Badge>;
  if (status === "archived") return <Badge>Archived</Badge>;
  return null;
}

/** A goal at a glance; the whole card opens its details. */
export function GoalCard({ goal, onAllocate }: { goal: GoalDTO; onAllocate?: () => void }) {
  const pct = goalProgress(goal.allocatedAmount, goal.targetAmount);
  const remaining = Math.max(0, goal.targetAmount - goal.allocatedAmount);
  const completed = goal.status === "achieved";
  const archived = goal.status === "archived";
  const targetDate = goal.targetDate ? fromISODate(goal.targetDate) : null;

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-4 rounded-md border border-border bg-surface p-5 shadow-card transition-colors hover:bg-surface-2",
        archived && "opacity-70",
      )}
    >
      <div className="flex items-start gap-3">
        <CategoryIcon icon={resolveGoalIcon(goal.icon)} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {/* Stretched link: the whole card is the tap target for details. */}
            <Link
              href={`/goals/detail?id=${goal.id}`}
              className="truncate text-body-md font-bold text-fg after:absolute after:inset-0 after:content-[''] focus:outline-none focus-visible:underline"
            >
              {goal.name}
            </Link>
            <GoalStatusBadge status={goal.status} />
          </div>
          <p className="mt-0.5 text-xs text-muted">
            {targetDate ? `Target: ${formatDate(targetDate)}` : "No target date"}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <p className="min-w-0 truncate text-body-md tabular-nums">
            <Money paise={goal.allocatedAmount} tone="default" className="font-bold" />
            <span className="text-muted"> / </span>
            <Money paise={goal.targetAmount} tone="muted" />
          </p>
          <span className="shrink-0 text-label-md tabular-nums text-muted">{formatPercent(pct, 0)}</span>
        </div>
        <Progress value={pct} tone={completed ? "income" : "brand"} />
        <p className="text-xs text-muted">
          {completed ? (
            "Fully allocated"
          ) : (
            <>
              <Money paise={remaining} tone="default" className="font-medium" /> remaining
            </>
          )}
        </p>
      </div>

      {onAllocate && !archived && !completed && (
        <div className="relative z-10 mt-auto">
          <Button size="sm" variant="secondary" onClick={onAllocate} className="w-full">
            <PlusCircle className="h-4 w-4" aria-hidden />
            Allocate money
          </Button>
        </div>
      )}
    </div>
  );
}
