import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Money } from "@/components/money";
import type { GoalsSummaryDTO } from "@/lib/types";
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

/**
 * Shown when spending has pushed the actual balance below what's allocated.
 * Allocations are never reduced automatically — the user reviews and adjusts.
 */
export function ShortfallBanner({ summary, reviewLink = false }: { summary: GoalsSummaryDTO; reviewLink?: boolean }) {
  if (summary.shortfall <= 0) return null;
  return (
    <div role="alert" className="flex gap-3 border border-expense bg-expense/10 p-4">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-expense" aria-hidden />
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
        <p className="mt-2 text-muted">
          Your goals haven&apos;t been changed. Review them and remove some allocation, or add the income you&apos;re expecting.
        </p>
        {reviewLink && (
          <Link
            href="/goals"
            className="mt-2 inline-flex items-center gap-1 text-label-md uppercase text-accent underline-offset-4 hover:underline"
          >
            Review goals
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        )}
      </div>
    </div>
  );
}
