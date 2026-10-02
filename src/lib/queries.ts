import "server-only";
import { cache } from "react";
import { prisma } from "./db";
import { accountBalance, type CalcTxn } from "./calculations";
import {
  serializeAccount,
  serializeCategory,
  serializeRecurring,
  serializeTag,
  serializeTransaction,
} from "./serialize";
import type {
  AccountDTO,
  BudgetDTO,
  CategoryDTO,
  PreferenceDTO,
  RecurringDTO,
  TagDTO,
  TransactionDTO,
} from "./types";
import { DEFAULT_DASHBOARD_WIDGETS, normalizeWidgets } from "./dashboard-widgets";

/**
 * Per-request cached raw loaders. Both the layout loaders AND
 * getMonthlyAnalytics need the accounts/categories/transactions tables; caching
 * them means a single render fetches each once instead of once per caller.
 */
export const getUserAccounts = cache((userId: string) =>
  prisma.account.findMany({ where: { userId }, orderBy: { sortOrder: "asc" } }),
);
export const getUserCategories = cache((userId: string) =>
  prisma.category.findMany({ where: { userId }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
);

/** Every non-deleted transaction for a user, as calc-ready rows. */
export const loadCalcTxns = cache(async (userId: string): Promise<CalcTxn[]> => {
  const rows = await prisma.transaction.findMany({
    where: { userId, deletedAt: null },
    select: {
      id: true,
      type: true,
      amount: true,
      description: true,
      date: true,
      categoryId: true,
      accountId: true,
      transferAccountId: true,
      deletedAt: true,
    },
  });
  return rows.map((r) => ({ ...r, type: r.type as CalcTxn["type"] }));
});

export async function loadAccounts(userId: string): Promise<AccountDTO[]> {
  const [accounts, txns] = await Promise.all([getUserAccounts(userId), loadCalcTxns(userId)]);
  return accounts.map((a) => serializeAccount(a, accountBalance({ id: a.id, openingBalance: a.openingBalance }, txns)));
}

export async function loadCategories(userId: string): Promise<CategoryDTO[]> {
  const rows = await getUserCategories(userId);
  return rows.map(serializeCategory);
}

export async function loadTags(userId: string): Promise<TagDTO[]> {
  const rows = await prisma.tag.findMany({ where: { userId }, orderBy: { name: "asc" } });
  return rows.map(serializeTag);
}

export async function loadTransactions(
  userId: string,
  opts: { take?: number; skip?: number } = {},
): Promise<TransactionDTO[]> {
  const rows = await prisma.transaction.findMany({
    where: { userId, deletedAt: null },
    include: { tags: { include: { tag: true } }, shares: { include: { contact: true } } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: opts.take,
    skip: opts.skip,
  });
  return rows.map(serializeTransaction);
}

export async function countTransactions(userId: string): Promise<number> {
  return prisma.transaction.count({
    where: { userId, deletedAt: null },
  });
}

/** Income/expense totals across every (undeleted) transaction, not just a loaded page. */
export async function loadTransactionTotals(userId: string): Promise<{ income: number; expense: number }> {
  const sums = await prisma.transaction.groupBy({
    by: ["type"],
    where: { userId, deletedAt: null },
    _sum: { amount: true },
  });
  return sums.reduce(
    (acc, s) => {
      const amount = s._sum.amount ?? 0;
      if (s.type === "income") acc.income += amount;
      else if (s.type === "expense") acc.expense += amount;
      return acc;
    },
    { income: 0, expense: 0 },
  );
}


export const loadPreference = cache(async (userId: string): Promise<PreferenceDTO> => {
  // Reuse the cached accounts (already fetched by loadAccounts in the layout)
  // and resolve default-account validity in memory, instead of
  // firing two or three separate `account` queries here.
  const [pref, accounts] = await Promise.all([
    prisma.userPreference.findUnique({ where: { userId } }),
    getUserAccounts(userId),
  ]);
  const activeAccounts = accounts.filter((a) => !a.isArchived); // already ordered by sortOrder

  let widgets: string[] = [...DEFAULT_DASHBOARD_WIDGETS];
  if (pref?.dashboardWidgets) {
    try {
      const parsed = JSON.parse(pref.dashboardWidgets);
      // Saved layouts may use the older, coarser widget keys — normalize.
      if (Array.isArray(parsed) && parsed.length) widgets = normalizeWidgets(parsed.map(String));
    } catch {
      /* fall back to defaults */
    }
  }

  // The saved default, or null for "No default" (or one since archived).
  // Don't substitute the first account here: Settings must show the choice
  // as saved, and the forms already fall back to the first account.
  const saved = pref?.defaultAccountId ?? null;
  const defaultAccountId = saved && activeAccounts.some((a) => a.id === saved) ? saved : null;

  return {
    dashboardWidgets: widgets,
    defaultAccountId,
  };
});

export async function loadRecurring(userId: string): Promise<RecurringDTO[]> {
  const rows = await prisma.recurringTransaction.findMany({
    where: { userId },
    orderBy: [{ isActive: "desc" }, { nextOccurrence: "asc" }],
  });
  return rows.map(serializeRecurring);
}

/**
 * Budget for a month. If no explicit Budget row exists, fall back to each
 * category's default monthlyBudget so the budgets screen is never empty.
 */
export async function loadBudget(userId: string, year: number, month: number): Promise<BudgetDTO> {
  const budget = await prisma.budget.findUnique({
    where: { userId_year_month: { userId, year, month } },
    include: { categories: true, accounts: true },
  });

  if (budget) {
    return {
      id: budget.id,
      year,
      month,
      overallLimit: budget.overallLimit,
      categories: budget.categories.map((c) => ({ categoryId: c.categoryId, limit: c.limit })),
      accountIds: budget.accounts.map((a) => a.accountId),
    };
  }

  // Fallback: build a virtual budget from category defaults.
  const cats = await prisma.category.findMany({
    where: { userId, monthlyBudget: { not: null }, isActive: true },
    select: { id: true, monthlyBudget: true },
  });
  return {
    id: null,
    year,
    month,
    overallLimit: null,
    categories: cats.map((c) => ({ categoryId: c.id, limit: c.monthlyBudget! })),
    accountIds: [],
  };
}
