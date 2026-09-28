"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/money";
import { useToast } from "@/components/ui/toast";
import { useAppData } from "../app-data";
import { ApiError, apiPost } from "@/lib/http";
import { formatINR } from "@/lib/money";
import { countsTowardAllocated, shortfallPlan } from "@/lib/goal-allocation";
import type { GoalDTO, GoalsSummaryDTO } from "@/lib/types";
import type { GoalsResponse } from "../goal-form";
import { cn } from "@/lib/cn";

function Tile({ label, children, hint, className }: { label: string; children: React.ReactNode; hint?: string; className?: string }) {
  return (
    <div className={cn("min-w-0 border border-border bg-surface p-sm", className)}>
      <p className="text-label-sm uppercase text-muted">{label}</p>
      <div className="mt-2 truncate text-headline-sm tabular-nums text-fg">{children}</div>
      {hint && <p className="mt-1 text-label-sm uppercase text-faint">{hint}</p>}
    </div>
  );
}

/**
 * Where the money stands: what's in the accounts, how much of it has been
 * given a purpose, and what's left to spend or allocate.
 */
export function MoneyStanding({ summary, activeGoals }: { summary: GoalsSummaryDTO; activeGoals: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Tile label="Active goals" hint={activeGoals === 1 ? "goal in progress" : "goals in progress"}>
        {activeGoals}
      </Tile>
      <Tile label="Actual balance" hint="what you physically have">
        <Money paise={summary.actualBalance} tone="default" />
      </Tile>
      <Tile label="Allocated" hint="reserved for goals">
        <Money paise={summary.totalAllocated} tone="default" />
      </Tile>
      <Tile label="Available" hint="what you can safely spend">
        <Money paise={summary.available} tone={summary.available < 0 ? "expense" : "default"} />
      </Tile>
    </div>
  );
}

/** Remembers (per browser) which over-allocation was hidden, so a new one shows again. */
const DISMISS_KEY = "baaki:shortfall-dismissed";

function planText(plan: { name: string; amount: number }[]): string {
  const parts = plan.slice(0, 3).map((p) => `${formatINR(p.amount)} from ${p.name}`);
  const more = plan.length - parts.length;
  return `Removes ${parts.join(", ")}${more > 0 ? ` and ${more} more` : ""}.`;
}

/**
 * Shown when spending has pushed the actual balance below what's allocated.
 * Allocations are never reduced automatically — the user can fix it in one
 * click (the plan is spelled out first), review the goals, or hide the
 * warning until the over-allocated amount changes.
 */
export function ShortfallBanner({
  summary,
  goals,
  reviewLink = false,
  onResolved,
}: {
  summary: GoalsSummaryDTO;
  goals: Pick<GoalDTO, "id" | "name" | "status" | "allocatedAmount">[];
  reviewLink?: boolean;
  /** Receives the refreshed goals; without it the page is refreshed. */
  onResolved?: (res: GoalsResponse) => void;
}) {
  const { refresh } = useAppData();
  const toast = useToast();
  const [fixing, setFixing] = useState(false);
  // null until the saved choice has been read, so a hidden banner never flashes.
  const [hiddenFor, setHiddenFor] = useState<number | null | undefined>(undefined);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(DISMISS_KEY);
      setHiddenFor(saved ? Number(saved) : null);
    } catch {
      setHiddenFor(null);
    }
  }, []);

  if (summary.shortfall <= 0 || hiddenFor === undefined || hiddenFor === summary.shortfall) return null;

  const plan = shortfallPlan(
    goals
      .filter((g) => countsTowardAllocated(g.status))
      .map((g) => ({ id: g.id, name: g.name, allocated: g.allocatedAmount })),
    summary.shortfall,
  );

  function hide() {
    setHiddenFor(summary.shortfall);
    try {
      window.localStorage.setItem(DISMISS_KEY, String(summary.shortfall));
    } catch {
      /* hiding still works for this visit */
    }
  }

  async function fix() {
    setFixing(true);
    try {
      const res = await apiPost<GoalsResponse & { removed: { name: string; amount: number }[] }>("/api/goals/resolve-shortfall", {});
      toast.success(res.removed.length ? `Allocations adjusted — ${planText(res.removed).replace(/^Removes/, "removed")}` : "Allocations already fit your balance");
      if (onResolved) onResolved(res);
      refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not adjust allocations.");
    } finally {
      setFixing(false);
    }
  }

  return (
    <div role="alert" className="relative flex gap-3 border border-expense bg-expense/10 p-4 pr-11">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-expense" aria-hidden />
      <button
        type="button"
        onClick={hide}
        aria-label="Hide this warning"
        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center text-muted transition-colors hover:text-fg"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
      <div className="min-w-0 text-body-sm">
        <p className="font-bold text-fg">
          You&apos;re over-allocated by <Money paise={summary.shortfall} tone="expense" />
        </p>
        <p className="mt-0.5 text-muted">Your current balance is less than the amount allocated to your goals.</p>
        <dl className="mt-2 grid max-w-xs grid-cols-[1fr_auto] gap-x-6 gap-y-0.5 tabular-nums">
          <dt className="text-muted">Actual balance</dt>
          <dd className="text-right"><Money paise={summary.actualBalance} tone="default" /></dd>
          <dt className="text-muted">Allocated to goals</dt>
          <dd className="text-right"><Money paise={summary.totalAllocated} tone="default" /></dd>
        </dl>
        {plan.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <Button size="sm" onClick={fix} loading={fixing}>
              Adjust allocations
            </Button>
            <span className="text-xs text-muted">{planText(plan)}</span>
          </div>
        )}
        <p className="mt-2 text-xs text-muted">
          Your goals only change if you choose to.
          {reviewLink && (
            <>
              {" "}
              <Link href="/goals" className="inline-flex items-center gap-0.5 text-accent underline-offset-4 hover:underline">
                Review goals
                <ArrowRight className="h-3 w-3" aria-hidden />
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
