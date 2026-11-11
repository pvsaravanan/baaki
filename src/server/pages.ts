import type { SessionUser } from "@/lib/auth";
import { getCategoryDetail, getMonthlyAnalytics, getPeriodReport } from "@/lib/analytics";
import { filterRange } from "@/lib/calculations";
import { parseReportPeriod } from "@/lib/report-period";
import {
  countTransactions,
  loadAccounts,
  loadCalcTxns,
  loadCategories,
  loadCategoryTransactionCounts,
  loadMonthTotals,
  loadPreference,
  loadRecurring,
  loadSplits,
  loadTags,
  loadTransactionTotals,
  loadTransactions,
} from "@/lib/queries";
import { monthKeyOf, monthRange, parseMonthKey, toISODate, type MonthKey } from "@/lib/dates";
import type { PerAccountRow, ReportsAnalytics } from "@/components/app/reports-view";

/**
 * What each screen needs from the database — the data half of what used to
 * be async Server Component pages. The screens call these through the local
 * API (usePageData in src/lib/local-api.ts); results are passed straight
 * back in memory, so Dates arrive as Dates just as they did from the server.
 */

type Params = Record<string, string | undefined>;

/** The month a `?m=YYYY-MM` param names, defaulting to this month. */
function monthOf(params: Params): MonthKey {
  return parseMonthKey(params.m) ?? monthKeyOf(new Date());
}

export const PAGE_LOADERS = {
  /** Everything the app shell provides to every screen. */
  async shell(user: SessionUser) {
    const [accounts, categories, tags, preference] = await Promise.all([
      loadAccounts(user.id),
      loadCategories(user.id),
      loadTags(user.id),
      loadPreference(user.id),
    ]);
    return { user, accounts, categories, tags, preference };
  },

  async dashboard(user: SessionUser, params: Params) {
    const [analytics, preference, recent, recurring] = await Promise.all([
      getMonthlyAnalytics(user.id, monthOf(params)),
      loadPreference(user.id),
      loadTransactions(user.id, { take: 6 }),
      loadRecurring(user.id),
    ]);
    return { analytics, preference, recent, recurring };
  },

  async accounts(user: SessionUser) {
    return { accounts: await loadAccounts(user.id) };
  },

  async budgets(user: SessionUser, params: Params) {
    const [analytics, categories] = await Promise.all([
      getMonthlyAnalytics(user.id, monthOf(params)),
      loadCategories(user.id),
    ]);
    return { budget: analytics.budget, categories };
  },

  async categories(user: SessionUser) {
    const [categories, transactionCounts] = await Promise.all([
      loadCategories(user.id),
      loadCategoryTransactionCounts(user.id),
    ]);
    return { categories, transactionCounts };
  },

  async category(user: SessionUser, params: Params) {
    const categories = await loadCategories(user.id);
    const category = categories.find((c) => c.id === params.id) ?? null;
    if (!category) return { category: null, detail: null };
    return { category, detail: await getCategoryDetail(user.id, category.id) };
  },

  async splits(user: SessionUser) {
    return loadSplits(user.id);
  },

  async recurring(user: SessionUser) {
    return { recurring: await loadRecurring(user.id) };
  },

  async reportsOverview(user: SessionUser, params: Params) {
    return { report: await getPeriodReport(user.id, parseReportPeriod(params.period)) };
  },

  async reports(user: SessionUser, params: Params) {
    const monthKey = monthOf(params);
    const txns = await loadCalcTxns(user.id);
    const analytics = await getMonthlyAnalytics(user.id, monthKey, txns);

    // Per-account activity for the selected month.
    const { start, end } = monthRange(monthKey);
    const byAccount = new Map<string, PerAccountRow>();
    const rowOf = (accountId: string) => {
      let row = byAccount.get(accountId);
      if (!row) byAccount.set(accountId, (row = { accountId, expense: 0, income: 0, count: 0 }));
      return row;
    };
    for (const t of filterRange(txns, start, end)) {
      const row = rowOf(t.accountId);
      row.count += 1;
      if (t.type === "expense") row.expense += t.amount;
      else if (t.type === "income") row.income += t.amount;
      // A transfer is also activity on the account it arrived in.
      if (t.type === "transfer" && t.transferAccountId) rowOf(t.transferAccountId).count += 1;
    }

    const serialized: ReportsAnalytics = {
      ...analytics,
      largestExpense: analytics.largestExpense
        ? { ...analytics.largestExpense, date: toISODate(analytics.largestExpense.date) }
        : null,
    };
    return { analytics: serialized, perAccount: [...byAccount.values()] };
  },

  async transactions(user: SessionUser) {
    const [transactions, total, totals, months] = await Promise.all([
      loadTransactions(user.id, { take: 50 }),
      countTransactions(user.id),
      loadTransactionTotals(user.id),
      loadMonthTotals({ userId: user.id, deletedAt: null }),
    ]);
    return { transactions, total, totals, months };
  },

};

export type PageName = keyof typeof PAGE_LOADERS;
export type PageData<K extends PageName> = Awaited<ReturnType<(typeof PAGE_LOADERS)[K]>>;
