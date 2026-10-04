import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "./db";
import { fromISODate } from "./dates";
import { BadRequestError, NotFoundError } from "./api";
import { accountDeltas, accountsLowered, balanceShortfalls, type Movement } from "./balance-guard";
import { formatINR } from "./money";
import type { ShareInput, TransactionInput } from "./validation";

/**
 * Refuse a change that would take an account below ₹0 (see balance-guard.ts).
 * `before` is what the change replaces (nothing for a new entry), `after` is
 * what it records. Balances are read fresh from the database.
 */
export async function assertSufficientBalance(userId: string, before: Movement[], after: Movement[]): Promise<void> {
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
    const message = `Not enough balance in ${name}: only ${formatINR(available)} available.`;
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
async function assertOwnership(userId: string, input: TransactionInput | Omit<TransactionInput, "tags">) {
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
    if (input.type !== "transfer") assertCategoryKindMatches(cat.kind, input.type);
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

/** A repayment is created by settling a share, and only that changes it. */
function assertNotRepayment(t: { type: string }) {
  if (t.type === "repayment") throw new BadRequestError("A repayment can't be changed. Settle or edit the shared expense instead.");
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
    paymentMethod: input.paymentMethod ?? null,
    notes: input.notes ?? null,
  };
}

export async function createTransaction(userId: string, input: TransactionInput): Promise<string> {
  await assertOwnership(userId, input);
  await assertSufficientBalance(userId, [], [movementOf(input)]);
  // Shares split a cost and are meaningless for a transfer (see the matching
  // schema refinement in validation.ts); drop them defensively so a transfer
  // can never carry shares regardless of how this function is called.
  const shares = input.type === "transfer" ? undefined : input.shares;
  // Validate shares before creating the row so an over-cap share fails fast
  // instead of leaving an orphaned transaction behind.
  if (shares?.length) await assertSharesValid(userId, shares, input.amount);
  const tagIds = await resolveTagIds(userId, input.tags ?? []);
  // The transaction row and its shares are created in one DB transaction so a
  // failure creating shares can't leave a shareless transaction behind.
  const created = await prisma.$transaction(async (tx) => {
    const txn = await tx.transaction.create({
      data: {
        ...toData(userId, input),
        tags: { create: tagIds.map((tagId) => ({ tagId })) },
      },
    });
    if (shares?.length) {
      await tx.expenseShare.createMany({
        data: shares.map((s) => ({ transactionId: txn.id, contactId: s.contactId, amount: s.amount })),
      });
    }
    return txn;
  });
  return created.id;
}

export async function updateTransaction(userId: string, id: string, input: TransactionInput) {
  const existing = await prisma.transaction.findFirst({
    where: { id, userId, deletedAt: null },
    select: { id: true, ...MOVEMENT_FIELDS },
  });
  if (!existing) throw new NotFoundError("Transaction not found");
  assertNotRepayment(existing);
  await assertOwnership(userId, input);
  await assertSufficientBalance(userId, [existing], [movementOf(input)]);
  // A transfer can never carry shares (see createTransaction / validation.ts).
  // Forcing an empty array here also clears any shares left over should an
  // existing expense be edited into a transfer.
  const shares = input.type === "transfer" ? [] : input.shares;
  // Validate shares before mutating the row so invalid shares don't commit the
  // edit (and blow away the old tags) and only then throw.
  const retainedShares = shares === undefined
    ? await prisma.expenseShare.findMany({ where: { transactionId: id }, select: { contactId: true, amount: true } })
    : shares;
  await assertSharesValid(userId, retainedShares, input.amount);
  const tagIds = await resolveTagIds(userId, input.tags ?? []);
  await prisma.$transaction([
    prisma.transactionTag.deleteMany({ where: { transactionId: id } }),
    prisma.transaction.update({
      where: { id },
      data: {
        ...toData(userId, input),
        tags: { create: tagIds.map((tagId) => ({ tagId })) },
      },
    }),
  ]);
  // `shares` omitted entirely means "leave as-is"; an explicit (possibly
  // empty) array means "replace with this".
  if (shares !== undefined) await attachShares(userId, id, shares);
  // Re-fetch once, fully hydrated, so the returned row reflects the shares
  // change above rather than the pre-attachShares snapshot.
  return prisma.transaction.findUniqueOrThrow({
    where: { id },
    include: { tags: { include: { tag: true } }, shares: { include: { contact: true } } },
  });
}

/**
 * Validate a set of shares BEFORE any rows are written: the sum must not
 * exceed `cap`, and every contact must belong to the user. Callers run this
 * up front so an invalid share can't commit a transaction/parts and only then
 * throw, leaving orphaned rows behind.
 */
export async function assertSharesValid(userId: string, shares: ShareInput[], cap: number): Promise<void> {
  if (!shares.length) return;
  const sum = shares.reduce((s, x) => s + x.amount, 0);
  if (sum > cap) throw new BadRequestError("Shared amounts can't exceed the total");
  if (new Set(shares.map((s) => s.contactId)).size !== shares.length) {
    throw new BadRequestError("Each person can only have one share");
  }
  const contactIds = shares.map((s) => s.contactId).filter((id): id is string => id !== null);
  const contacts = await prisma.contact.findMany({ where: { id: { in: contactIds }, userId }, select: { id: true } });
  if (contacts.length !== contactIds.length) throw new NotFoundError("Contact not found");
}

/**
 * Replace a transaction's shares with a new set, matched by contactId
 * against whatever shares already exist on `transactionId` — a contact who
 * stays on the split has their row updated (amount only) rather than
 * deleted and recreated, so `settled`/`settledAt` survives an edit instead
 * of silently reverting to "owed" every time (e.g. fixing a typo on an
 * already-settled split expense).
 */
export async function attachShares(
  userId: string,
  transactionId: string,
  shares: ShareInput[],
): Promise<void> {
  const txn = await prisma.transaction.findFirst({
    where: { id: transactionId, userId, deletedAt: null },
    select: { id: true, amount: true },
  });
  if (!txn) throw new NotFoundError("Transaction not found");

  await assertSharesValid(userId, shares, txn.amount);

  const existing = await prisma.expenseShare.findMany({
    where: { transactionId },
    select: { id: true, contactId: true },
  });
  const existingIdByContact = new Map(existing.map((s) => [s.contactId, s.id]));
  const keep = new Set(shares.map((s) => s.contactId));
  const toDelete = existing.filter((s) => !keep.has(s.contactId)).map((s) => s.id);
  const toUpdate = shares.filter((s) => existingIdByContact.has(s.contactId));
  const toCreate = shares.filter((s) => !existingIdByContact.has(s.contactId));

  await prisma.$transaction([
    ...(toDelete.length ? [prisma.expenseShare.deleteMany({ where: { id: { in: toDelete } } })] : []),
    ...toUpdate.map((s) =>
      prisma.expenseShare.update({
        where: { id: existingIdByContact.get(s.contactId)! },
        data: { amount: s.amount },
      }),
    ),
    ...(toCreate.length
      ? [
          prisma.expenseShare.createMany({
            data: toCreate.map((s) => ({ transactionId, contactId: s.contactId, amount: s.amount })),
          }),
        ]
      : []),
  ]);
}

/** Soft-delete. Returns the id so the caller can offer undo. */
export async function softDeleteTransaction(userId: string, id: string): Promise<void> {
  const existing = await prisma.transaction.findFirst({ where: { id, userId, deletedAt: null } });
  if (!existing) throw new NotFoundError("Transaction not found");
  assertNotRepayment(existing);
  await prisma.transaction.update({ where: { id }, data: { deletedAt: new Date() } });
}

/** Soft-delete a batch of transactions in one go (multi-select "delete" in the transactions list). */
export async function bulkSoftDeleteTransactions(userId: string, ids: string[]): Promise<number> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return 0;
  const result = await prisma.transaction.updateMany({
    where: { id: { in: unique }, userId, deletedAt: null, type: { not: "repayment" } },
    data: { deletedAt: new Date() },
  });
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
 * original. Shares are deliberately NOT carried over: the duplicate is a
 * new, separate purchase. There's no follow-up step in the UI to confirm who
 * it's shared with, so silently attaching the same contacts/amounts would
 * create a fresh, un-reviewed debt (e.g. duplicating a past split dinner
 * would owe your friend money again for nothing they agreed to). Add sharing
 * to the copy explicitly if needed.
 */
export async function duplicateTransaction(userId: string, id: string): Promise<string> {
  const original = await prisma.transaction.findFirst({
    where: { id, userId, deletedAt: null },
    include: { tags: true },
  });
  if (!original) throw new NotFoundError("Transaction not found");
  assertNotRepayment(original);
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
      paymentMethod: original.paymentMethod,
      notes: original.notes,
      tags: { create: original.tags.map((t) => ({ tagId: t.tagId })) },
    },
  });
  return copy.id;
}
