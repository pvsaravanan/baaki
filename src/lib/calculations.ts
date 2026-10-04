/**
 * Pure financial calculation layer.
 *
 * Every function here is deterministic and free of I/O so it can be unit-tested
 * in isolation (see calculations.test.ts). All amounts are integer paise.
 *
 * Rules (from the product spec):
 *  - Balance = opening + income − expenses − transfers-out + transfers-in
 *  - Transfers between the user's own accounts are NOT income or expense.
 *  - Savings = income − expenses
 *  - Savings rate = (income − expenses) / income × 100  (0 when income = 0)
 *  - Category spending counts the expenses in that category.
 */

import type { TransactionType } from "./constants";
import { addDays, daysBetween, startOfDay, toISODate, zonedParts } from "./dates";

/** Minimal transaction shape the calc layer needs. Framework-agnostic. */
export interface CalcTxn {
  id?: string;
  type: TransactionType;
  amount: number; // paise, always positive
  description?: string;
  date: Date;
  categoryId?: string | null;
  accountId: string;
  transferAccountId?: string | null;
  deletedAt?: Date | null;
  /** Part of an expense other people owe back (their shares of a split). */
  sharedAmount?: number;
}

export interface CalcAccount {
  id: string;
  openingBalance: number; // paise
}

export function isActive(t: CalcTxn): boolean {
  return t.deletedAt == null;
}

/**
 * What an entry costs you. For an expense split with other people that's your
 * own share, whether their repayment has arrived yet or not; for anything else
 * it's the whole amount. Balances use the full amount instead — that's the cash
 * that actually moved.
 */
export function ownAmount(t: CalcTxn): number {
  return t.type === "expense" ? Math.max(0, t.amount - (t.sharedAmount ?? 0)) : t.amount;
}

/** The same figure for a transaction as the screens receive it (its shares are attached). */
export function ownAmountOf(t: { type: string; amount: number; shares: { amount: number; direction: string }[] }): number {
  if (t.type !== "expense") return t.amount;
  const shared = t.shares.reduce((sum, s) => sum + (s.direction === "owed_to_you" ? s.amount : 0), 0);
  return Math.max(0, t.amount - shared);
}

export function activeOnly<T extends CalcTxn>(txns: T[]): T[] {
  return txns.filter(isActive);
}

function inRange(date: Date, start?: Date, end?: Date): boolean {
  if (start && date.getTime() < start.getTime()) return false;
  if (end && date.getTime() >= end.getTime()) return false;
  return true;
}

/** Filter to active transactions within [start, end) (bounds optional). */
export function filterRange<T extends CalcTxn>(txns: T[], start?: Date, end?: Date): T[] {
  return txns.filter((t) => isActive(t) && inRange(t.date, start, end));
}

/**
 * Balance of a single account: opening balance plus the net effect of every
 * active transaction that touches it (as source or transfer destination).
 */
export function accountBalance(account: CalcAccount, txns: CalcTxn[]): number {
  let balance = account.openingBalance;
  for (const t of txns) {
    if (!isActive(t)) continue;
    if (t.accountId === account.id) {
      switch (t.type) {
        case "income":
        case "repayment": // someone paid back their share of a split
          balance += t.amount;
          break;
        case "expense":
          balance -= t.amount;
          break;
        case "transfer":
          balance -= t.amount; // money leaving the source account
          break;
      }
    }
    if (t.type === "transfer" && t.transferAccountId === account.id) {
      balance += t.amount; // money arriving in the destination account
    }
  }
  return balance;
}

/** Total balance across all accounts (transfers net to zero). */
export function totalBalance(accounts: CalcAccount[], txns: CalcTxn[]): number {
  return accounts.reduce((sum, a) => sum + accountBalance(a, txns), 0);
}

/**
 * The money you actually have: every non-archived account's balance, summed.
 * This is the dashboard's "Balance" and the base that goal allocations are
 * set aside from — one definition, so the two can never disagree.
 */
export function actualBalance(accounts: (CalcAccount & { isArchived: boolean })[], txns: CalcTxn[]): number {
  return totalBalance(accounts.filter((a) => !a.isArchived), txns);
}

export interface PeriodSummary {
  income: number; // gross income
  grossExpense: number;
  /** Total spending (same as grossExpense). */
  effectiveExpense: number;
  transfersOut: number;
  transfersIn: number;
  net: number; // income − effectiveExpense (a.k.a. net savings / net cash flow)
  savingsRate: number; // percent, 0 when income = 0
  count: number; // active transactions in the period
}

/** Summarize a set of already-range-filtered transactions. */
export function summarize(txns: CalcTxn[]): PeriodSummary {
  let income = 0;
  let grossExpense = 0;
  let transfersOut = 0;
  let transfersIn = 0;
  let count = 0;

  for (const t of txns) {
    if (!isActive(t)) continue;
    count += 1;
    switch (t.type) {
      case "income":
        income += t.amount;
        break;
      case "expense":
        grossExpense += ownAmount(t);
        break;
      case "transfer":
        transfersOut += t.amount;
        transfersIn += t.amount;
        break;
    }
  }

  const effectiveExpense = grossExpense;
  const net = income - effectiveExpense;
  const savingsRate = income > 0 ? (net / income) * 100 : 0;

  return {
    income,
    grossExpense,
    effectiveExpense,
    transfersOut,
    transfersIn,
    net,
    savingsRate,
    count,
  };
}

export interface CategoryTotal {
  categoryId: string | null;
  expense: number; // expense in category
  net: number; // spend used by budgets and charts (same as expense)
  count: number;
}

/**
 * Spending grouped by category. Only expense transactions contribute.
 */
export function categoryTotals(txns: CalcTxn[]): CategoryTotal[] {
  const map = new Map<string | null, CategoryTotal>();
  for (const t of txns) {
    if (!isActive(t)) continue;
    if (t.type !== "expense") continue;
    const key = t.categoryId ?? null;
    let entry = map.get(key);
    if (!entry) {
      entry = { categoryId: key, expense: 0, net: 0, count: 0 };
      map.set(key, entry);
    }
    entry.expense += ownAmount(t);
    entry.net = entry.expense;
    entry.count += 1;
  }
  return [...map.values()].sort((a, b) => b.net - a.net);
}

/** Total of one kind of transaction (expenses or income) in a single category. */
export function categoryAmount(txns: CalcTxn[], categoryId: string, type: "expense" | "income"): number {
  let total = 0;
  for (const t of txns) {
    if (!isActive(t) || t.categoryId !== categoryId) continue;
    if (t.type === type) total += ownAmount(t);
  }
  return total;
}

/** Spend for a single category. */
export function categorySpend(txns: CalcTxn[], categoryId: string): number {
  return categoryAmount(txns, categoryId, "expense");
}

export interface DailyPoint {
  date: string; // YYYY-MM-DD
  expense: number; // expenses that day
  income: number;
  count: number;
}

/** Per-day totals across [start, end). Fills gaps so every day is present. */
export function dailySeries(txns: CalcTxn[], start: Date, end: Date): DailyPoint[] {
  const byDay = new Map<string, DailyPoint>();
  const cursor = startOfDay(start);
  while (cursor.getTime() < end.getTime()) {
    const key = toISODate(cursor);
    byDay.set(key, { date: key, expense: 0, income: 0, count: 0 });
    cursor.setTime(addDays(cursor, 1).getTime());
  }
  for (const t of txns) {
    if (!isActive(t)) continue;
    const key = toISODate(t.date);
    const point = byDay.get(key);
    if (!point) continue;
    point.count += 1;
    if (t.type === "expense") point.expense += ownAmount(t);
    else if (t.type === "income") point.income += t.amount;
  }
  return [...byDay.values()];
}

/**
 * Percentage change from previous to current.
 * Returns null when it cannot be expressed as a sane percentage: previous is
 * 0 and current is non-zero (so the UI can show "New" instead of Infinity),
 * or current and previous have different signs (e.g. previous -50, current
 * +5000 computes as +10100% of the old magnitude — a swing from a loss to a
 * gain isn't meaningfully a percentage of the old baseline at all).
 */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  if (current !== 0 && Math.sign(current) !== Math.sign(previous)) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export type BudgetState = "under" | "warning" | "over";

export interface BudgetStatus {
  limit: number;
  spent: number;
  remaining: number; // can be negative when over budget
  utilization: number; // percent (spent / limit * 100)
  state: BudgetState;
}

/** Budget status for a category or the overall budget. Warning at >= 90%. */
export function budgetStatus(spent: number, limit: number, warnAt = 90): BudgetStatus {
  const remaining = limit - spent;
  const utilization = limit > 0 ? (spent / limit) * 100 : spent > 0 ? Infinity : 0;
  let state: BudgetState = "under";
  // Exactly at the limit (100% utilization) is "over" too — labelling it
  // "warning" implied there was still headroom. The `limit > 0 || spent > 0`
  // guard keeps a 0/0 budget as "under" rather than flipping it to "over".
  if (spent >= limit && (limit > 0 || spent > 0)) state = "over";
  else if (utilization >= warnAt) state = "warning";
  return { limit, spent, remaining, utilization, state };
}

/**
 * Monthly contribution needed to reach a savings goal by its target date.
 * Returns the paise/month required; 0 if already reached or no valid date.
 */
export function monthlyContributionNeeded(
  target: number,
  current: number,
  today: Date,
  targetDate: Date | null,
): number {
  const remaining = target - current;
  if (remaining <= 0) return 0;
  if (!targetDate) return remaining;
  const months = monthsBetween(today, targetDate);
  if (months <= 0) return remaining;
  return Math.ceil(remaining / months);
}

/** Whole months from `from` to `to`, minimum 0. Partial months round up to 1. */
export function monthsBetween(from: Date, to: Date): number {
  if (to.getTime() <= from.getTime()) return 0;
  const f = zonedParts(from);
  const t = zonedParts(to);
  let months = (t.year - f.year) * 12 + (t.month - f.month);
  if (t.day > f.day) months += 1;
  return Math.max(months, 1);
}

/** Average daily spend across a period given its effective expense total. */
export function averageDailySpend(effectiveExpense: number, start: Date, end: Date): number {
  const days = Math.max(daysBetween(start, end), 1);
  return Math.round(effectiveExpense / days);
}
