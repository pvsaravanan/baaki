import type { BudgetStatus } from "./calculations";
import { daysInMonth, monthKeyOf, monthKeyString, monthLabel, toISODate, type MonthKey } from "./dates";
import { formatPercent } from "./money";

export interface BudgetInsight {
  tone: "good" | "caution" | "over";
  title: string;
  message: string;
}

/**
 * How far ahead of the month, in percentage points, spending can run before
 * "on track" stops being true. Some lead is normal: rent and bills land early.
 */
const PACE_MARGIN = 15;

/** The one-line verdict on a month's overall budget, as of `now`. */
export function budgetInsight(status: BudgetStatus, month: MonthKey, now: Date): BudgetInsight {
  const shown = monthKeyString(month);
  const current = monthKeyString(monthKeyOf(now));

  if (shown > current) {
    return { tone: "good", title: "Budget set", message: `Your budget for ${monthLabel(month)} is ready.` };
  }

  const used = formatPercent(status.utilization, 0);
  const over = status.state === "over";

  if (shown < current) {
    return {
      tone: over ? "over" : "good",
      title: over ? "You went over budget" : "You stayed within budget",
      message: `You spent ${used} of your total budget in ${monthLabel(month)}.`,
    };
  }

  const today = Number(toISODate(now).slice(8, 10));
  const total = daysInMonth(month);
  const daysLeft = total - today + 1; // today still counts
  const message = `You've spent ${used} of your total budget with ${daysLeft} ${daysLeft === 1 ? "day" : "days"} left.`;

  if (over) return { tone: "over", title: "Over budget", message };
  if (status.state === "warning") return { tone: "caution", title: "Close to your limit", message };
  if (status.utilization > (today / total) * 100 + PACE_MARGIN) return { tone: "caution", title: "Spending quickly", message };
  return { tone: "good", title: "You're on track!", message };
}
