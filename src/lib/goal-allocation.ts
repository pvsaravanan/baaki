/**
 * Goals as *virtual allocations*: money that stays in your accounts but is
 * given a purpose. Allocating never creates a transaction and never changes
 * an account balance — it only lowers what's "available":
 *
 *   actual balance  = every non-archived account's balance (calculations.actualBalance)
 *   total allocated = what's allocated to goals that aren't archived
 *   available       = actual balance − total allocated
 *
 * A goal's allocation history is its GoalContribution rows: a positive amount
 * allocates, a negative one removes. Its allocated amount is their sum.
 *
 * Pure functions only — the server enforces them (goals-service) and the UI
 * uses the same ones to explain what's possible.
 */
import { accountDeltas, type Movement } from "./balance-guard";
import { addMonthsToDate, daysBetween } from "./dates";
import { formatINR } from "./money";
import type { GoalStatus } from "./constants";

/** Archived goals keep their history but release their money back to available. */
export function countsTowardAllocated(status: string): boolean {
  return status !== "archived";
}

export function allocatedAmount(history: { amount: number }[]): number {
  return history.reduce((sum, h) => sum + h.amount, 0);
}

export function totalAllocated(goals: { status: string; allocated: number }[]): number {
  return goals.filter((g) => countsTowardAllocated(g.status)).reduce((sum, g) => sum + g.allocated, 0);
}

export interface AllocationSummary {
  actualBalance: number;
  totalAllocated: number;
  /** actual − allocated; negative when allocations exceed the money you have. */
  available: number;
  /** How far allocations exceed the actual balance (0 when they fit). */
  shortfall: number;
}

export function allocationSummary(actual: number, allocated: number): AllocationSummary {
  const available = actual - allocated;
  // Only a shortfall *caused by* allocations: an account balance that's
  // negative on its own, with nothing allocated, isn't the goals' doing.
  const shortfall = allocated > 0 ? Math.min(allocated, Math.max(0, -available)) : 0;
  return { actualBalance: actual, totalAllocated: allocated, available, shortfall };
}

/** Why `amount` can't be allocated, or null if it can. */
export function allocateError(amount: number, available: number): string | null {
  if (amount <= 0) return "Enter an amount greater than zero.";
  if (available <= 0) return "You have no money available to allocate.";
  if (amount > available) return `You only have ${formatINR(available)} available to allocate.`;
  return null;
}

/** Why `amount` can't be removed from a goal holding `allocated`, or null if it can. */
export function removeError(amount: number, allocated: number): string | null {
  if (amount <= 0) return "Enter an amount greater than zero.";
  if (amount > allocated) return `This goal only has ${formatINR(Math.max(0, allocated))} allocated.`;
  return null;
}

/**
 * A goal's status after its allocation or target changes: completed once
 * fully allocated, active again if it drops below. Archived is left alone —
 * only the user archives or restores.
 */
export function statusFor(current: string, allocated: number, target: number): GoalStatus {
  if (current === "archived") return "archived";
  return allocated >= target ? "achieved" : "active";
}

export function goalProgress(allocated: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.max(0, (allocated / target) * 100));
}

const DAYS_PER_MONTH = 30.44;
/** How far back the allocation pace looks. */
const PACE_WINDOW_DAYS = 90;
/** Less history than this and a pace would just be noise. */
const MIN_HISTORY_DAYS = 28;

/**
 * Average net allocation per month over the last ~3 months (or since the
 * first allocation, if more recent). Null without enough history or when the
 * pace isn't positive.
 */
export function monthlyAllocationPace(history: { amount: number; date: Date }[], today: Date): number | null {
  if (!history.length) return null;
  const first = history.reduce((min, h) => (h.date < min ? h.date : min), history[0].date);
  const age = daysBetween(first, today);
  if (age < MIN_HISTORY_DAYS) return null;
  const windowDays = Math.min(age, PACE_WINDOW_DAYS);
  const net = history
    .filter((h) => daysBetween(h.date, today) <= windowDays)
    .reduce((sum, h) => sum + h.amount, 0);
  if (net <= 0) return null;
  return Math.round(net / (windowDays / DAYS_PER_MONTH));
}

/** When the goal would be fully allocated at `pace` per month, or null. */
export function estimatedCompletion(remaining: number, pace: number | null, today: Date): Date | null {
  if (remaining <= 0 || !pace || pace <= 0) return null;
  return addMonthsToDate(today, Math.ceil(remaining / pace));
}

/**
 * How replacing `before` with `after` (the entry being saved, and its old
 * version when editing) changes the actual balance — only non-archived
 * accounts count, as in actualBalance. Transfers between counted accounts net
 * to zero.
 */
export function actualBalanceChange(
  before: Movement[],
  after: Movement[],
  accounts: { id: string; isArchived: boolean }[],
): number {
  const counted = new Set(accounts.filter((a) => !a.isArchived).map((a) => a.id));
  const sum = (moves: Movement[]) =>
    [...accountDeltas(moves)].reduce((total, [id, delta]) => total + (counted.has(id) ? delta : 0), 0);
  return sum(after) - sum(before);
}

/**
 * How much of a balance change would come out of money reserved for goals:
 * the part of the spend beyond what's available, up to the reserved money
 * that still physically exists. Once earlier spending has already eaten into
 * the allocations, only what's left of the actual balance can be spent from
 * them — anything beyond that takes the balance below zero instead. Zero for
 * changes that don't lower the balance.
 */
export function goalMoneySpent(summary: { available: number; totalAllocated: number }, balanceChange: number): number {
  if (balanceChange >= 0 || summary.totalAllocated <= 0) return 0;
  const actual = summary.available + summary.totalAllocated;
  const reservedStillThere = Math.min(summary.totalAllocated, Math.max(0, actual));
  const beyondAvailable = -balanceChange - Math.max(0, summary.available);
  return Math.min(Math.max(0, beyondAvailable), reservedStillThere);
}

/**
 * Which goals to take `shortfall` off so allocations fit the actual balance
 * again: shared in proportion to what each holds (largest remainders get the
 * leftover paise), never more than a goal has. Empty when there's nothing to fix.
 */
export function shortfallPlan(
  goals: { id: string; name: string; allocated: number }[],
  shortfall: number,
): { id: string; name: string; amount: number }[] {
  const holding = goals.filter((g) => g.allocated > 0);
  const total = holding.reduce((sum, g) => sum + g.allocated, 0);
  if (shortfall <= 0 || total <= 0) return [];
  const target = Math.min(shortfall, total);
  const shares = holding.map((g) => {
    const exact = (target * g.allocated) / total;
    return { g, amount: Math.floor(exact), rest: exact - Math.floor(exact) };
  });
  let left = target - shares.reduce((sum, s) => sum + s.amount, 0);
  for (const s of [...shares].sort((a, b) => b.rest - a.rest)) {
    if (left <= 0) break;
    if (s.amount < s.g.allocated) {
      s.amount += 1;
      left -= 1;
    }
  }
  return shares.filter((s) => s.amount > 0).map((s) => ({ id: s.g.id, name: s.g.name, amount: s.amount }));
}
