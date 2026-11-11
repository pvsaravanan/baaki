import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "./db";
import { toISODate } from "./dates";
import { accountBalance, type CalcTxn } from "./calculations";
import {
  serializeAccount,
  serializeCategory,
  serializeRecurring,
  serializeSplit,
  serializeTag,
  serializeTransaction,
  TXN_INCLUDE,
} from "./serialize";
import type {
  AccountDTO,
  BudgetDTO,
  CategoryDTO,
  MonthTotals,
  OpenSplitDTO,
  PreferenceDTO,
  RecurringDTO,
  TagDTO,
  TransactionDTO,
} from "./types";
import { DEFAULT_DASHBOARD_WIDGETS, normalizeWidgets } from "./dashboard-widgets";

/**
 * Short-lived cache for the raw loaders. One screen load asks for the
 * accounts, categories and every transaction from several places (the app
 * frame, analytics); sharing one read between them keeps a load from
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
      splits: { select: { amount: true, settledAccountId: true } },
    },
  });
  return rows.map(({ splits, ...r }) => ({
    ...r,
    type: r.type as CalcTxn["type"],
    sharedAmount: splits.reduce((sum, s) => sum + s.amount, 0),
    received: splits.flatMap((s) => (s.settledAccountId ? [{ accountId: s.settledAccountId, amount: s.amount }] : [])),
  }));
});

export async function loadAccounts(userId: string): Promise<AccountDTO[]> {
  const [accounts, txns] = await Promise.all([getUserAccounts(userId), loadCalcTxns(userId)]);
  return accounts.map((a) => serializeAccount(a, accountBalance({ id: a.id, openingBalance: a.openingBalance }, txns)));
}

/** How many transactions each category has, by id. Categories with none are left out. */
export async function loadCategoryTransactionCounts(userId: string): Promise<Record<string, number>> {
  const rows = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: { userId, deletedAt: null, categoryId: { not: null } },
    _count: { _all: true },
  });
  return Object.fromEntries(rows.map((r) => [r.categoryId as string, r._count._all]));
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
    include: TXN_INCLUDE,
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
  return loadTotals({ userId, deletedAt: null });
}

/**
 * Income and expense across every transaction matching `where`. Expense is
 * your own share: other people's splits are left out, as everywhere else.
 */
export async function loadTotals(where: Prisma.TransactionWhereInput): Promise<{ income: number; expense: number }> {
  const [sums, shared] = await Promise.all([
    prisma.transaction.groupBy({ by: ["type"], where, _sum: { amount: true } }),
    prisma.splitShare.aggregate({ where: { transaction: { AND: [where, { type: "expense" }] } }, _sum: { amount: true } }),
  ]);
  const totals = { income: 0, expense: -(shared._sum.amount ?? 0) };
  for (const s of sums) {
    const amount = s._sum.amount ?? 0;
    if (s.type === "income") totals.income += amount;
    else if (s.type === "expense") totals.expense += amount;
  }
  return totals;
}

/**
 * Income and expense per month ("2026-09") across every transaction matching
 * `where`, not just a loaded page. The list loads in pages, so a month's totals
 * can't be added up on the screen: they'd be short until the whole month loads.
 * Expense is your own share, as in loadTotals.
 */
export async function loadMonthTotals(where: Prisma.TransactionWhereInput): Promise<MonthTotals> {
  const rows = await prisma.transaction.findMany({
    where: { AND: [where, { type: { in: ["income", "expense"] } }] },
    select: { date: true, type: true, amount: true, splits: { select: { amount: true } } },
  });
  const months: MonthTotals = {};
  for (const r of rows) {
    const month = (months[toISODate(r.date).slice(0, 7)] ??= { income: 0, expense: 0 });
    if (r.type === "income") month.income += r.amount;
    else month.expense += Math.max(0, r.amount - r.splits.reduce((sum, s) => sum + s.amount, 0));
  }
  return months;
}

/**
 * Split shares still to collect (oldest first), and the last few paid back
 * so they can be undone. Shares of deleted expenses are left out.
 */
export async function loadSplits(userId: string): Promise<{ open: OpenSplitDTO[]; settled: OpenSplitDTO[] }> {
  const live = { transaction: { userId, deletedAt: null } };
  const include = { transaction: { select: { description: true, date: true, accountId: true } } } as const;
  const [open, settled] = await Promise.all([
    prisma.splitShare.findMany({
      where: { ...live, settledAt: null },
      include,
      orderBy: [{ transaction: { date: "asc" } }, { createdAt: "asc" }],
    }),
    prisma.splitShare.findMany({ where: { ...live, settledAt: { not: null } }, include, orderBy: { settledAt: "desc" }, take: 10 }),
  ]);
  const toDTO = (s: (typeof open)[number]): OpenSplitDTO => ({
    ...serializeSplit(s),
    transactionId: s.transactionId,
    description: s.transaction.description,
    date: toISODate(s.transaction.date),
    accountId: s.transaction.accountId,
  });
  return { open: open.map(toDTO), settled: settled.map(toDTO) };
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
