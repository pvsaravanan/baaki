import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "./db";
import { addDays, fromISODate, startOfDay } from "./dates";
import { BadRequestError, NotFoundError } from "./api";
import { accountDeltas, accountsLowered, balanceShortfalls, type Movement } from "./balance-guard";
import { formatINR } from "./money";
import { computeNextOccurrence } from "./recurring";
import type { Frequency } from "./constants";
import type { TransactionInput } from "./validation";

/**
 * Refuse a change that would take an account below ₹0 (see balance-guard.ts).
 * `before` is what the change replaces (nothing for a new entry), `after` is
 * what it records. Balances are read fresh from the database.
 */
export async function assertSufficientBalance(
  userId: string,
  before: Movement[],
  after: Movement[],
  opts: { removing?: boolean } = {},
): Promise<void> {
  const ids = accountsLowered(before, after);
  if (ids.length === 0) return;
  const [accounts, txns] = await Promise.all([
    prisma.account.findMany({
      where: { userId, id: { in: ids } },
      select: { id: true, name: true, type: true, openingBalance: true },
    }),
    prisma.transaction.findMany({
      where: { userId, deletedAt: null, OR: [{ accountId: { in: ids } }, { transferAccountId: { in: ids } }] },
      select: { type: true, amount: true, accountId: true, transferAccountId: true },
    }),
  ]);
  const recorded = accountDeltas(txns);
  const shortfalls = balanceShortfalls(
    before,
    after,
    accounts.map((a) => ({ id: a.id, name: a.name, type: a.type, balance: a.openingBalance + (recorded.get(a.id) ?? 0) })),
  );
  if (shortfalls.length > 0) {
    const { name, available } = shortfalls[0];
    const message = opts.removing
      ? `Can't delete this: ${name} would go below ₹0 (it holds ${formatINR(available)} without it).`
      : `Not enough balance in ${name}: only ${formatINR(available)} available.`;
    throw new BadRequestError(message, { amount: message });
  }
}

function movementOf(input: Pick<TransactionInput, "type" | "amount" | "accountId" | "transferAccountId">): Movement {
  return {
    type: input.type,
    amount: input.amount,
    accountId: input.accountId,
    transferAccountId: input.type === "transfer" ? input.transferAccountId ?? null : null,
  };
}

const MOVEMENT_FIELDS = { type: true, amount: true, accountId: true, transferAccountId: true } as const;

/** Ensure the referenced account(s) and category belong to the user. */
async function assertOwnership(
  userId: string,
  input: TransactionInput | Omit<TransactionInput, "tags">,
  existing?: { type: string; categoryId: string | null },
) {
  const accountIds = [input.accountId, input.transferAccountId].filter(Boolean) as string[];
  const accounts = await prisma.account.findMany({
    where: { id: { in: accountIds }, userId },
    select: { id: true },
  });
  if (accounts.length !== new Set(accountIds).size) throw new NotFoundError("Account not found");

  if (input.categoryId) {
    const cat = await prisma.category.findFirst({
      where: { id: input.categoryId, userId },
      select: { id: true, kind: true },
    });
    if (!cat) throw new NotFoundError("Category not found");
    // A transfer never actually keeps its categoryId (toData nulls it out),
    // so there's nothing meaningful to kind-check here.
    // Nor is an edit that keeps the entry's own type and category: changing a
    // category's kind later must not lock its old entries against edits (a
    // new note, say).
    const unchanged = existing?.type === input.type && existing.categoryId === input.categoryId;
    if (input.type !== "transfer" && !unchanged) assertCategoryKindMatches(cat.kind, input.type);
  }
}

/**
 * A category's `kind` ("expense" | "income" | "both") must be compatible
 * with the transaction type it's attached to, mirroring the filtering the
 * transaction form already does client-side (see transaction-form.tsx) —
 * this is the server-side backstop for a direct API call that skips it. Only
 * "income" needs an income-kind category.
 */
function assertCategoryKindMatches(kind: string, type: string) {
  if (kind === "both") return;
  const wantsIncomeKind = type === "income";
  if ((kind === "income") !== wantsIncomeKind) {
    throw new BadRequestError(wantsIncomeKind ? "That category is for expenses, not income" : "That category is for income, not expenses");
  }
}

/** Find-or-create tags by name for a user and return their ids. */
async function resolveTagIds(userId: string, names: string[]): Promise<string[]> {
  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  if (unique.length === 0) return [];
  // One insert for the missing tags, one read to fetch them all — instead of a
  // sequential upsert per tag, which was N round-trips against the hosted DB.
  await prisma.tag.createMany({
    data: unique.map((name) => ({ userId, name })),
    skipDuplicates: true,
  });
  const rows = await prisma.tag.findMany({
    where: { userId, name: { in: unique } },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

function toData(userId: string, input: TransactionInput): Prisma.TransactionUncheckedCreateInput {
  const date = fromISODate(input.date);
  if (!date) throw new NotFoundError("Invalid date");
  return {
    userId,
    type: input.type,
    amount: input.amount,
    description: input.description,
    merchant: input.merchant ?? null,
    date,
    categoryId: input.type === "transfer" ? null : input.categoryId ?? null,
    accountId: input.accountId,
    transferAccountId: input.type === "transfer" ? input.transferAccountId ?? null : null,
    notes: input.notes ?? null,
  };
}

export async function createTransaction(userId: string, input: TransactionInput): Promise<string> {
  await assertOwnership(userId, input);
  await assertSufficientBalance(userId, [], [movementOf(input)]);
  const tagIds = await resolveTagIds(userId, input.tags ?? []);
  const data = {
    ...toData(userId, input),
    tags: { create: tagIds.map((tagId) => ({ tagId })) },
  };
  if (!input.repeat) {
    const created = await prisma.transaction.create({ data });
    return created.id;
  }
  const repeat = input.repeat;
  return prisma.$transaction(async (db) => {
    const rule = await db.recurringTransaction.create({ data: repeatingRuleFor(userId, input, data.date as Date, repeat) });
    const created = await db.transaction.create({ data: { ...data, recurringId: rule.id } });
    return created.id;
  });
}

/**
 * The rule that repeats a new entry: it starts on the entry's date, which counts
 * as already posted, so its first occurrence is a later one and the entry isn't
 * recorded twice. Like a rule made by hand, it waits for you to post each
 * occurrence unless you turn on auto-post.
 */
function repeatingRuleFor(
  userId: string,
  input: TransactionInput,
  date: Date,
  frequency: Frequency,
): Prisma.RecurringTransactionUncheckedCreateInput {
  const dayAfter = addDays(startOfDay(date), 1);
  const today = startOfDay(new Date());
  return {
    userId,
    // A description may be longer than a rule's name.
    name: input.description.slice(0, 120),
    type: input.type,
    amount: input.amount,
    categoryId: input.type === "transfer" ? null : input.categoryId ?? null,
    accountId: input.accountId,
    transferAccountId: input.type === "transfer" ? input.transferAccountId ?? null : null,
    notes: input.notes ?? null,
    frequency,
    interval: 1,
    startDate: startOfDay(date),
    lastPostedDate: startOfDay(date),
    nextOccurrence: computeNextOccurrence(date, frequency, 1, dayAfter > today ? dayAfter : today),
  };
}

export async function updateTransaction(userId: string, id: string, input: TransactionInput) {
  const existing = await prisma.transaction.findFirst({
    where: { id, userId, deletedAt: null },
    select: { id: true, categoryId: true, ...MOVEMENT_FIELDS },
  });
  if (!existing) throw new NotFoundError("Transaction not found");
  await assertOwnership(userId, input, existing);
  await assertSufficientBalance(userId, [existing], [movementOf(input)]);
  const tagIds = await resolveTagIds(userId, input.tags ?? []);
  // The edit and its tags commit together or not at all.
  return prisma.$transaction(async (db) => {
    await db.transactionTag.deleteMany({ where: { transactionId: id } });
    return db.transaction.update({
      where: { id },
      data: {
        ...toData(userId, input),
        tags: { create: tagIds.map((tagId) => ({ tagId })) },
      },
      include: { tags: { include: { tag: true } } },
    });
  });
}

/** Soft-delete. Returns the id so the caller can offer undo. */
export async function softDeleteTransaction(userId: string, id: string): Promise<void> {
  const existing = await prisma.transaction.findFirst({ where: { id, userId, deletedAt: null } });
  if (!existing) throw new NotFoundError("Transaction not found");
  // Deleting income (or a transfer in) lowers a balance just as spending does.
  await assertSufficientBalance(userId, [existing], [], { removing: true });
  await prisma.transaction.update({ where: { id }, data: { deletedAt: new Date() } });
}

/** Soft-delete a batch of transactions in one go (multi-select "delete" in the transactions list). */
export async function bulkSoftDeleteTransactions(userId: string, ids: string[]): Promise<number> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return 0;
  const where = { id: { in: unique }, userId, deletedAt: null };
  // The whole batch is checked together: removing some income may be fine
  // when the expenses it paid for go in the same batch.
  const doomed = await prisma.transaction.findMany({ where, select: { id: true, ...MOVEMENT_FIELDS } });
  await assertSufficientBalance(userId, doomed, [], { removing: true });
  const result = await prisma.transaction.updateMany({ where: { id: { in: doomed.map((t) => t.id) } }, data: { deletedAt: new Date() } });
  return result.count;
}

export async function restoreTransaction(userId: string, id: string): Promise<void> {
  const existing = await prisma.transaction.findFirst({ where: { id, userId } });
  if (!existing) throw new NotFoundError("Transaction not found");
  if (existing.deletedAt) await assertSufficientBalance(userId, [], [existing]);
  await prisma.transaction.update({ where: { id }, data: { deletedAt: null } });
}

/**
 * One-click copy of a transaction (see the "Duplicate" row menu item) — for
 * logging a similar purchase again, not for re-creating everything about the
 * original.
 */
export async function duplicateTransaction(userId: string, id: string): Promise<string> {
  const original = await prisma.transaction.findFirst({
    where: { id, userId, deletedAt: null },
    include: { tags: true },
  });
  if (!original) throw new NotFoundError("Transaction not found");
  await assertSufficientBalance(userId, [], [original]);
  const copy = await prisma.transaction.create({
    data: {
      userId,
      type: original.type,
      amount: original.amount,
      description: original.description,
      merchant: original.merchant,
      date: original.date,
      categoryId: original.categoryId,
      accountId: original.accountId,
      transferAccountId: original.transferAccountId,
      notes: original.notes,
      tags: { create: original.tags.map((t) => ({ tagId: t.tagId })) },
    },
  });
  return copy.id;
}
