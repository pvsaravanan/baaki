import { prisma } from "./db";
import { BadRequestError } from "./api";
import { fromISODate } from "./dates";
import { LOCAL_EMAIL } from "./auth";

/**
 * Full backups. Everything lives only on the phone, so a backup file is the
 * one way to move to a new phone or recover from an uninstall.
 *
 * Version 2 (written here) holds every table as-is. Restore also reads
 * version 1 — the "Full backup" the baaki website exports — so an online
 * account can be brought onto the phone once; that format has no people,
 * shared expenses or preferences, which then start empty/default.
 */

export const BACKUP_VERSION = 2;

type Row = Record<string, unknown>;

// Field kinds: s = string, s? = nullable string, i = integer (paise, counts),
// i? = nullable integer, b = boolean, d = date, d? = nullable date.
type Kind = "s" | "s?" | "i" | "i?" | "b" | "d" | "d?";
type Spec = Record<string, Kind>;

const SPECS = {
  accounts: {
    id: "s", name: "s", type: "s", openingBalance: "i", color: "s", icon: "s", isArchived: "b", sortOrder: "i",
    createdAt: "d", updatedAt: "d",
  },
  categories: {
    id: "s", name: "s", icon: "s", color: "s", kind: "s", monthlyBudget: "i?", parentId: "s?", isActive: "b",
    isSystem: "b", systemKey: "s?", sortOrder: "i", createdAt: "d", updatedAt: "d",
  },
  tags: { id: "s", name: "s", color: "s" },
  recurring: {
    id: "s", name: "s", type: "s", amount: "i", categoryId: "s?", accountId: "s", transferAccountId: "s?",
    paymentMethod: "s?", notes: "s?", frequency: "s", interval: "i", startDate: "d", endDate: "d?",
    nextOccurrence: "d", lastPostedDate: "d?", isActive: "b", autoPost: "b", createdAt: "d", updatedAt: "d",
  },
  transactions: {
    id: "s", type: "s", amount: "i", description: "s", merchant: "s?", date: "d", categoryId: "s?", accountId: "s",
    transferAccountId: "s?", paymentMethod: "s?", notes: "s?", recurringId: "s?", splitGroupId: "s?",
    createdAt: "d", updatedAt: "d", deletedAt: "d?",
  },
  transactionTags: { transactionId: "s", tagId: "s" },
  budgets: { id: "s", year: "i", month: "i", overallLimit: "i?", createdAt: "d", updatedAt: "d" },
  budgetCategories: { id: "s", budgetId: "s", categoryId: "s", limit: "i" },
  goals: {
    id: "s", name: "s", icon: "s", color: "s", targetAmount: "i", targetDate: "d?", accountId: "s?", status: "s",
    createdAt: "d", updatedAt: "d",
  },
  goalContributions: { id: "s", goalId: "s", amount: "i", date: "d", note: "s?", createdAt: "d" },
  contacts: { id: "s", name: "s", color: "s", isArchived: "b", createdAt: "d" },
  expenseShares: {
    id: "s", transactionId: "s?", contactId: "s", amount: "i", direction: "s", description: "s?", date: "d",
    settled: "b", settledAt: "d?", createdAt: "d",
  },
} satisfies Record<string, Spec>;

type Table = keyof typeof SPECS;

/** Everything on the device, as one JSON-ready object. */
export async function buildBackup(userId: string) {
  const where = { userId };
  const [user, preference, accounts, categories, tags, recurring, transactions, budgets, goals, contacts] =
    await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      prisma.userPreference.findUnique({ where }),
      prisma.account.findMany({ where, orderBy: { sortOrder: "asc" } }),
      prisma.category.findMany({ where, orderBy: { sortOrder: "asc" } }),
      prisma.tag.findMany({ where }),
      prisma.recurringTransaction.findMany({ where }),
      prisma.transaction.findMany({ where, include: { tags: true }, orderBy: [{ date: "asc" }, { createdAt: "asc" }] }),
      prisma.budget.findMany({ where, include: { categories: true } }),
      prisma.financialGoal.findMany({ where, include: { contributions: true } }),
      prisma.contact.findMany({ where, include: { shares: true } }),
    ]);

  return {
    app: "baaki",
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    note: "All monetary values are in integer paise (1 rupee = 100 paise).",
    user: { name: user.name, avatarUrl: user.avatarUrl },
    preference: preference && {
      currency: preference.currency,
      locale: preference.locale,
      monthStartDay: preference.monthStartDay,
      dashboardWidgets: preference.dashboardWidgets,
      defaultAccountId: preference.defaultAccountId,
      appLock: preference.appLock,
    },
    accounts: accounts.map((r) => omit(r, "userId")),
    categories: categories.map((r) => omit(r, "userId")),
    tags: tags.map((r) => omit(r, "userId")),
    recurring: recurring.map((r) => omit(r, "userId")),
    transactions: transactions.map((r) => omit(r, "userId", "tags")),
    transactionTags: transactions.flatMap((t) => t.tags),
    budgets: budgets.map((r) => omit(r, "userId", "categories")),
    budgetCategories: budgets.flatMap((b) => b.categories),
    goals: goals.map((r) => omit(r, "userId", "contributions")),
    goalContributions: goals.flatMap((g) => g.contributions),
    contacts: contacts.map((r) => omit(r, "userId", "shares")),
    expenseShares: contacts.flatMap((c) => c.shares),
  };
}

/**
 * A row without some fields: its owner (rows are restored under the device's
 * own profile) and nested relations (each table is listed on its own).
 */
function omit<T extends object, K extends keyof T>(row: T, ...keys: K[]): Omit<T, K> {
  const out = { ...row };
  for (const key of keys) delete out[key];
  return out;
}

const DAMAGED = "This file isn't a baaki backup, or it's damaged.";

function read(value: unknown, kind: Kind, field: string): unknown {
  const nullable = kind.endsWith("?");
  if (value === null || value === undefined) {
    if (nullable) return null;
    throw new BadRequestError(`${DAMAGED} (missing ${field})`);
  }
  switch (kind[0]) {
    case "s":
      if (typeof value !== "string") break;
      return value;
    case "i":
      if (typeof value !== "number" || !Number.isInteger(value)) break;
      return value;
    case "b":
      if (typeof value !== "boolean") break;
      return value;
    case "d": {
      if (typeof value !== "string") break;
      // The website's export writes calendar days as YYYY-MM-DD.
      const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? fromISODate(value) : new Date(value);
      if (!date || Number.isNaN(date.getTime())) break;
      return date;
    }
  }
  throw new BadRequestError(`${DAMAGED} (bad ${field})`);
}

function rows(backup: Row, table: Table, defaults: Row = {}): Row[] {
  const list = backup[table] ?? [];
  if (!Array.isArray(list)) throw new BadRequestError(DAMAGED);
  const spec: Spec = SPECS[table];
  return list.map((raw) => {
    if (typeof raw !== "object" || raw === null) throw new BadRequestError(DAMAGED);
    const out: Row = {};
    for (const [field, kind] of Object.entries(spec)) {
      const value = (raw as Row)[field] ?? defaults[field];
      out[field] = read(value, kind, `${table}.${field}`);
    }
    return out;
  });
}

export interface RestoreSummary {
  accounts: number;
  transactions: number;
}

/**
 * Replace everything on the device with a backup's contents, in one
 * transaction: if anything in the file is unreadable, nothing changes.
 */
export async function restoreBackup(userId: string, input: unknown): Promise<RestoreSummary> {
  if (typeof input !== "object" || input === null) throw new BadRequestError(DAMAGED);
  const backup = input as Row;
  if (backup.app !== "baaki" || (backup.version !== 1 && backup.version !== 2)) throw new BadRequestError(DAMAGED);

  // Timestamps the website's version-1 export left out.
  const now = new Date().toISOString();
  const stamps = { createdAt: now, updatedAt: now };

  const accounts = rows(backup, "accounts", stamps);
  const categories = rows(backup, "categories", stamps);
  const tags = rows(backup, "tags");
  const recurring = rows(backup, "recurring", stamps);
  const budgets = rows(backup, "budgets", stamps);
  const goals = rows(backup, "goals", stamps);
  const contacts = rows(backup, "contacts", stamps);

  let transactions: Row[];
  let transactionTags: Row[];
  let budgetCategories: Row[];
  let goalContributions: Row[];
  let expenseShares: Row[];
  if (backup.version === 2) {
    transactions = rows(backup, "transactions");
    transactionTags = rows(backup, "transactionTags");
    budgetCategories = rows(backup, "budgetCategories");
    goalContributions = rows(backup, "goalContributions", stamps);
    expenseShares = rows(backup, "expenseShares", stamps);
  } else {
    // Version 1 nests these, and names each transaction's tags.
    const v1Transactions = (Array.isArray(backup.transactions) ? backup.transactions : []) as Row[];
    transactions = rows({ transactions: v1Transactions }, "transactions", stamps);
    const tagIds = new Map(tags.map((t) => [t.name as string, t.id as string]));
    transactionTags = v1Transactions.flatMap((t) =>
      (Array.isArray(t.tags) ? t.tags : []).flatMap((name) => {
        const tagId = tagIds.get(String(name));
        return tagId ? [{ transactionId: t.id as string, tagId }] : [];
      }),
    );
    const nested = (table: "budgets" | "goals", key: string) =>
      ((Array.isArray(backup[table]) ? backup[table] : []) as Row[]).flatMap((r) =>
        Array.isArray(r[key]) ? (r[key] as Row[]) : [],
      );
    budgetCategories = rows({ budgetCategories: nested("budgets", "categories") }, "budgetCategories");
    goalContributions = rows({ goalContributions: nested("goals", "contributions") }, "goalContributions", stamps);
    expenseShares = [];
  }

  const user = backup.user as Row | undefined;
  const preference = backup.preference as Row | null | undefined;
  const own = (list: Row[]) => list.map((r) => ({ ...r, userId }));

  await prisma.$transaction(async (tx) => {
    const current = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    // Deleting the profile clears every table (they all cascade from it);
    // it's recreated with the same id so the app carries on seamlessly.
    await tx.user.delete({ where: { id: userId } });
    await tx.user.create({
      data: {
        id: userId,
        email: LOCAL_EMAIL,
        name: typeof user?.name === "string" && user.name.trim() ? user.name : current.name,
        avatarUrl: typeof user?.avatarUrl === "string" ? user.avatarUrl : current.avatarUrl,
      },
    });

    // Parents before children; each list is one INSERT, so rows may refer to
    // each other within it (sub-categories to their parent).
    await tx.account.createMany({ data: own(accounts) as never });
    await tx.category.createMany({ data: own(categories) as never });
    await tx.tag.createMany({ data: own(tags) as never });
    await tx.recurringTransaction.createMany({ data: own(recurring) as never });
    await tx.transaction.createMany({ data: own(transactions) as never });
    await tx.transactionTag.createMany({ data: transactionTags as never });
    await tx.budget.createMany({ data: own(budgets) as never });
    await tx.budgetCategory.createMany({ data: budgetCategories as never });
    await tx.financialGoal.createMany({ data: own(goals) as never });
    await tx.goalContribution.createMany({ data: goalContributions as never });
    await tx.contact.createMany({ data: own(contacts) as never });
    await tx.expenseShare.createMany({ data: expenseShares as never });

    const defaultAccountId =
      typeof preference?.defaultAccountId === "string" && accounts.some((a) => a.id === preference.defaultAccountId)
        ? preference.defaultAccountId
        : ((accounts.find((a) => !a.isArchived)?.id as string | undefined) ?? null);
    await tx.userPreference.create({
      data: {
        userId,
        currency: typeof preference?.currency === "string" ? preference.currency : "INR",
        locale: typeof preference?.locale === "string" ? preference.locale : "en-IN",
        monthStartDay: typeof preference?.monthStartDay === "number" ? preference.monthStartDay : 1,
        dashboardWidgets: typeof preference?.dashboardWidgets === "string" ? preference.dashboardWidgets : "[]",
        defaultAccountId,
        appLock: preference?.appLock === true,
      },
    });
  });

  return { accounts: accounts.length, transactions: transactions.filter((t) => t.deletedAt === null).length };
}
