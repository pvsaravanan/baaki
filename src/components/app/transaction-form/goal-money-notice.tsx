import Link from "next/link";
import { PiggyBank } from "lucide-react";
import { formatINR } from "@/lib/money";
import type { GoalMoneyDTO } from "@/lib/types";

/** "Macbook (₹2,500)", "Macbook (₹2,500) and Trip (₹1,000)", "… and 2 more goals". */
export function reservedGoalsText(reserved: GoalMoneyDTO["reserved"]): string {
  const named = reserved.slice(0, 2).map((g) => `${g.name} (${formatINR(g.allocated)})`);
  const more = reserved.length - named.length;
  if (more > 0) return `${named.join(", ")} and ${more} more goal${more === 1 ? "" : "s"}`;
  return named.join(" and ");
}

/**
 * Heads-up while entering an expense that's bigger than what's available:
 * part of it would come out of money allocated to goals. Informational — the
 * expense can still be saved, and the goals aren't changed.
 */
export function GoalMoneyNotice({ fromGoals, goalMoney }: { fromGoals: number; goalMoney: GoalMoneyDTO }) {
  if (fromGoals <= 0) return null;
  const available = Math.max(0, goalMoney.summary.available);
  return (
    <div role="status" className="flex gap-2.5 border border-warning bg-warning/10 px-3 py-2.5 text-body-sm">
      <PiggyBank className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
      <div className="min-w-0">
        <p className="text-fg">
          <span className="font-bold">{formatINR(fromGoals)}</span> of this comes from money reserved for{" "}
          {reservedGoalsText(goalMoney.reserved)}.
        </p>
        <p className="mt-0.5 text-xs text-muted">
          You have {formatINR(available)} available to spend. Your goals won&apos;t change —{" "}
          <Link href="/goals" className="underline underline-offset-2 hover:text-fg">
            review them
          </Link>{" "}
          if you&apos;re using that money.
        </p>
      </div>
    </div>
  );
}
