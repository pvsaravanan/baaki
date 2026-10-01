import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "./db";
import { BadRequestError, NotFoundError } from "./api";
import { actualBalance, type CalcTxn } from "./calculations";
import { fromISODate, toISODate } from "./dates";
import { formatINR } from "./money";
import { getUserAccounts, loadCalcTxns } from "./queries";
import { serializeGoal } from "./serialize";
import {
  allocateError,
  allocatedAmount,
  allocationSummary,
  countsTowardAllocated,
  removeError,
  shortfallPlan,
  statusFor,
  totalAllocated,
} from "./goal-allocation";
import type { GoalDTO, GoalMoneyDTO, GoalsSummaryDTO } from "./types";

/**
 * Goals as virtual allocations (see goal-allocation.ts). Nothing here ever
 * creates a transaction or touches an account balance: allocating only
 * records a GoalContribution row, which lowers what's *available*.
 */

type Db = Prisma.TransactionClient;

const GOAL_ORDER: Prisma.FinancialGoalOrderByWithRelationInput[] = [{ status: "asc" }, { createdAt: "desc" }];

/** Goals plus where the money stands, for a page render (uses the per-request caches). */
export async function loadGoalsOverview(userId: string): Promise<{ goals: GoalDTO[]; summary: GoalsSummaryDTO }> {
  const [rows, accounts, txns] = await Promise.all([
    prisma.financialGoal.findMany({ where: { userId }, include: { contributions: true }, orderBy: GOAL_ORDER }),
    getUserAccounts(userId),
    loadCalcTxns(userId),
  ]);
  const goals = rows.map(serializeGoal);
  return { goals, summary: summarize(actualBalance(accounts, txns), goals) };
}

/** The slim version for every page (the transaction form warns with it). */
export async function loadGoalMoney(userId: string): Promise<GoalMoneyDTO> {
  const { goals, summary } = await loadGoalsOverview(userId);
  return {
    summary,
    reserved: goals
      .filter((g) => countsTowardAllocated(g.status) && g.allocatedAmount > 0)
      .map((g) => ({ id: g.id, name: g.name, allocated: g.allocatedAmount })),
  };
}

function summarize(actual: number, goals: GoalDTO[]): GoalsSummaryDTO {
  return allocationSummary(
    actual,
    totalAllocated(goals.map((g) => ({ status: g.status, allocated: g.allocatedAmount }))),
  );
}

/** Actual balance and total allocated, read inside a transaction. */
async function standing(db: Db, userId: string) {
  const [accounts, txns, goals] = await Promise.all([
    db.account.findMany({ where: { userId }, select: { id: true, openingBalance: true, isArchived: true } }),
    db.transaction.findMany({
      where: { userId, deletedAt: null },
      select: { type: true, amount: true, date: true, accountId: true, transferAccountId: true, deletedAt: true },
    }),
    db.financialGoal.findMany({ where: { userId }, select: { id: true, status: true, contributions: { select: { amount: true } } } }),
  ]);
  const actual = actualBalance(accounts, txns as CalcTxn[]);
  const allocated = totalAllocated(goals.map((g) => ({ status: g.status, allocated: allocatedAmount(g.contributions) })));
  return allocationSummary(actual, allocated);
}

async function ownedGoal(db: Db, userId: string, id: string) {
  const goal = await db.financialGoal.findFirst({
    where: { id, userId },
    include: { contributions: { select: { amount: true } } },
  });
  if (!goal) throw new NotFoundError("Goal not found");
  return { ...goal, allocated: allocatedAmount(goal.contributions) };
}

/**
 * Every allocation change re-reads balances and allocations and writes in one
 * Serializable transaction, so two changes racing for the same available
 * money can't both pass the check (Postgres aborts one; withUser reports it
 * as "try again").
 */
function serializable<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn, { isolationLevel: "Serializable" });
}

async function syncStatus(db: Db, goal: { id: string; status: string }, allocated: number, target: number) {
  const next = statusFor(goal.status, allocated, target);
  if (next !== goal.status) await db.financialGoal.update({ where: { id: goal.id }, data: { status: next } });
}

export async function allocateToGoal(userId: string, goalId: string, amount: number, note?: string | null) {
  await serializable(async (db) => {
    const goal = await ownedGoal(db, userId, goalId);
    if (goal.status === "archived") throw new BadRequestError("Restore this goal before allocating money to it.");
    const { available } = await standing(db, userId);
    const error = allocateError(amount, available);
    if (error) throw new BadRequestError(error, { amount: error });
    await db.goalContribution.create({ data: { goalId, amount, date: new Date(), note: note || null } });
    await syncStatus(db, goal, goal.allocated + amount, goal.targetAmount);
  });
}

export async function removeFromGoal(userId: string, goalId: string, amount: number, note?: string | null) {
  await serializable(async (db) => {
    const goal = await ownedGoal(db, userId, goalId);
    const error = removeError(amount, goal.allocated);
    if (error) throw new BadRequestError(error, { amount: error });
    await db.goalContribution.create({ data: { goalId, amount: -amount, date: new Date(), note: note || null } });
    await syncStatus(db, goal, goal.allocated - amount, goal.targetAmount);
  });
}

export async function createGoal(
  userId: string,
  input: { name: string; icon: string; targetAmount: number; targetDate?: string | null },
) {
  if (input.targetDate && input.targetDate < toISODate(new Date())) {
    throw new BadRequestError("Target date can't be in the past", { targetDate: "Target date can't be in the past" });
  }
  const goal = await prisma.financialGoal.create({
    data: {
      userId,
      name: input.name,
      icon: input.icon,
      targetAmount: input.targetAmount,
      targetDate: input.targetDate ? fromISODate(input.targetDate) : null,
      status: "active",
    },
  });
  return goal.id;
}

export async function updateGoal(
  userId: string,
  goalId: string,
  input: Partial<{
    name: string;
    icon: string;
    targetAmount: number;
    targetDate: string | null;
    status: "active" | "archived";
  }>,
) {
  await serializable(async (db) => {
    const goal = await ownedGoal(db, userId, goalId);
    const target = input.targetAmount ?? goal.targetAmount;

    let status: string = goal.status;
    if (input.status === "archived") status = "archived";
    else if (input.status === "active" && goal.status === "archived") {
      // Restoring brings this goal's allocation back into the total — only
      // if the money for it is still available (an archived goal isn't
      // counted in `available` right now).
      const { available } = await standing(db, userId);
      if (goal.allocated > 0 && goal.allocated > available) {
        throw new BadRequestError(
          `Restoring this goal needs ${formatINR(goal.allocated)} available, but you only have ${formatINR(Math.max(0, available))}. Remove some of its allocation first.`,
        );
      }
      status = "active";
    }
    // Completed follows the allocation: raising the target above it reopens
    // the goal, lowering it to or below the allocation completes it.
    status = statusFor(status, goal.allocated, target);

    await db.financialGoal.update({
      where: { id: goalId },
      data: {
        name: input.name,
        icon: input.icon,
        targetAmount: input.targetAmount,
        targetDate: input.targetDate === undefined ? undefined : input.targetDate ? fromISODate(input.targetDate) : null,
        status,
      },
    });
  });
}

/**
 * One-click fix for over-allocation: take the shortfall off the goals (shared
 * in proportion to what each holds) so allocations fit the actual balance
 * again. Recorded as ordinary removals in each goal's history. Returns what
 * was removed from each goal; empty when there was nothing to fix.
 */
export async function resolveShortfall(userId: string) {
  return serializable(async (db) => {
    const { shortfall } = await standing(db, userId);
    if (shortfall <= 0) return [];
    const goals = await db.financialGoal.findMany({
      where: { userId, status: { not: "archived" } },
      select: { id: true, name: true, status: true, targetAmount: true, contributions: { select: { amount: true } } },
      orderBy: GOAL_ORDER,
    });
    const withAllocated = goals.map((g) => ({ ...g, allocated: allocatedAmount(g.contributions) }));
    const plan = shortfallPlan(withAllocated, shortfall);
    for (const step of plan) {
      const goal = withAllocated.find((g) => g.id === step.id)!;
      await db.goalContribution.create({
        data: { goalId: goal.id, amount: -step.amount, date: new Date(), note: "Adjusted to match your balance" },
      });
      await syncStatus(db, goal, goal.allocated - step.amount, goal.targetAmount);
    }
    return plan;
  });
}

/** Deleting releases the goal's allocation back to available (its history goes with it). */
export async function deleteGoal(userId: string, goalId: string) {
  const goal = await prisma.financialGoal.findFirst({ where: { id: goalId, userId }, select: { id: true } });
  if (!goal) throw new NotFoundError("Goal not found");
  await prisma.financialGoal.delete({ where: { id: goalId } });
}
