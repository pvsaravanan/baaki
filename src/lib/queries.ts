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
 * Short-lived cache for the raw loaders. One screen load asks for the
 * accounts, categories and every transaction from several places (the app
 * frame, goals, analytics); sharing one read between them keeps a load from
 * reading the whole history over and over. (React's `cache` doesn't do this
 * outside server rendering.)
 *
 * The cache is emptied whenever the app writes (see local-server.ts) and in
 * any case after a couple of seconds, so a screen never sees stale data.
 */
const CACHE_TTL_MS = 2000;
const memoized = new Map<string, Promise<unknown>>();
let expiry: ReturnType<typeof setTimeout> | undefined;

export function clearQueryCache(): void {
  memoized.clear();
  clearTimeout(expiry);
  expiry = undefined;
}

function memo<T>(name: string, fn: (userId: string) => Promise<T>): (userId: string) => Promise<T> {
  return (userId) => {
    const key = `${name}:${userId}`;
    const hit = memoized.get(key);
    if (hit) return hit as Promise<T>;
    const pending = fn(userId);
    memoized.set(key, pending);
    pending.catch(() => memoized.delete(key)); // never keep a failure
    expiry ??= setTimeout(clearQueryCache, CACHE_TTL_MS);
    return pending;
  };
}

export const getUserAccounts = memo("accounts", (userId: string) =>
  prisma.account.findMany({ where: { userId }, orderBy: { sortOrder: "asc" } }),
);
export const getUserCategories = memo("categories", (userId: string) =>
  prisma.category.findMany({ where: { userId }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
);

/** Every non-deleted transaction for a user, as calc-ready rows. */
export const loadCalcTxns = memo("calcTxns", async (userId: string): Promise<CalcTxn[]> => {
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
      shares: { where: { direction: "owed_to_you" }, select: { amount: true } },
    },
  });
  return rows.map(({ shares, ...r }) => ({
    ...r,
    type: r.type as CalcTxn["type"],
    sharedAmount: shares.reduce((sum, s) => sum + s.amount, 0),
  }));
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
  const [sums, sharedOut] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["type"],
      where: { userId, deletedAt: null },
      _sum: { amount: true },
    }),
    // What others owe back on expenses isn't your spending.
    prisma.expenseShare.aggregate({
      where: { direction: "owed_to_you", transaction: { is: { userId, deletedAt: null, type: "expense" } } },
      _sum: { amount: true },
    }),
  ]);
  const totals = sums.reduce(
    (acc, s) => {
      const amount = s._sum.amount ?? 0;
      if (s.type === "income") acc.income += amount;
      else if (s.type === "expense") acc.expense += amount;
      return acc;
    },
    { income: 0, expense: 0 },
  );
  totals.expense = Math.max(0, totals.expense - (sharedOut._sum.amount ?? 0));
  return totals;
}


export const loadPreference = memo("preference", async (userId: string): Promise<PreferenceDTO> => {
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
    appLock: pref?.appLock ?? false,
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
