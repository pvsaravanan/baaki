import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { BadRequestError, NotFoundError } from "./api";
import { assertSufficientBalance } from "./tx-service";
import { serializeContact } from "./serialize";
import { toISODate, fromISODate } from "./dates";
import type { ContactDTO, ShareDirection } from "./types";

export interface ContactShareRow {
  id: string;
  amount: number; // paise
  direction: ShareDirection;
  settled: boolean;
  settledAt: string | null;
  transactionId: string | null;
  description: string;
  date: string;
}

// A share counts toward a live balance only if it's either standalone
// (no transaction) or its transaction still exists (not soft-deleted).
const LIVE_SHARE: Prisma.ExpenseShareWhereInput = {
  OR: [{ transactionId: null }, { transaction: { deletedAt: null } }],
};

/** Every ledger line (both directions, settled and pending) with one contact, newest first. */
export async function loadContactShares(userId: string, contactId: string): Promise<ContactShareRow[]> {
  const rows = await prisma.expenseShare.findMany({
    where: { contactId, contact: { userId }, ...LIVE_SHARE },
    include: { transaction: { select: { id: true, description: true, date: true } } },
    orderBy: [{ settled: "asc" }, { createdAt: "desc" }],
  });
  return rows.map((s) => ({
    id: s.id,
    amount: s.amount,
    direction: s.direction as ShareDirection,
    settled: s.settled,
    settledAt: s.settledAt ? toISODate(s.settledAt) : null,
    transactionId: s.transaction?.id ?? null,
    description: s.transaction?.description ?? s.description ?? "Manual entry",
    date: s.transaction ? toISODate(s.transaction.date) : toISODate(s.date),
  }));
}

/** Contacts with their current net balance (unsettled shares, both directions). */
export async function loadContacts(userId: string): Promise<ContactDTO[]> {
  const contacts = await prisma.contact.findMany({
    where: { userId },
    orderBy: [{ isArchived: "asc" }, { name: "asc" }],
    include: {
      shares: {
        where: { settled: false, ...LIVE_SHARE },
        select: { amount: true, direction: true },
      },
    },
  });
  return contacts.map((c) => {
    let owedToYou = 0;
    let youOwe = 0;
    for (const s of c.shares) {
      if (s.direction === "you_owe") youOwe += s.amount;
      else owedToYou += s.amount;
    }
    return serializeContact(c, owedToYou, youOwe);
  });
}

export async function createContact(userId: string, input: { name: string; color?: string }) {
  return prisma.contact.create({
    data: { userId, name: input.name.trim(), color: input.color ?? "#64748b" },
  });
}

export async function updateContact(
  userId: string,
  id: string,
  input: Partial<{ name: string; color: string; isArchived: boolean }>,
): Promise<void> {
  const existing = await prisma.contact.findFirst({ where: { id, userId } });
  if (!existing) throw new NotFoundError("Contact not found");
  await prisma.contact.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.color !== undefined && { color: input.color }),
      ...(input.isArchived !== undefined && { isArchived: input.isArchived }),
    },
  });
}

/** Hard-delete if the contact has no share history, otherwise archive so past splits keep a name. */
export async function deleteContact(userId: string, id: string): Promise<void> {
  const existing = await prisma.contact.findFirst({ where: { id, userId } });
  if (!existing) throw new NotFoundError("Contact not found");
  const shareCount = await prisma.expenseShare.count({ where: { contactId: id } });
  if (shareCount > 0) {
    await prisma.contact.update({ where: { id }, data: { isArchived: true } });
  } else {
    await prisma.contact.delete({ where: { id } });
  }
}

/** Record a standalone ledger entry against a contact (either direction). */
export async function createStandaloneShare(
  userId: string,
  contactId: string,
  input: { amount: number; direction: ShareDirection; description?: string | null; date?: string },
): Promise<void> {
  const contact = await prisma.contact.findFirst({ where: { id: contactId, userId }, select: { id: true } });
  if (!contact) throw new NotFoundError("Contact not found");
  const date = input.date ? fromISODate(input.date) ?? new Date() : new Date();
  await prisma.expenseShare.create({
    data: {
      contactId,
      amount: input.amount,
      direction: input.direction,
      description: input.description?.trim() || null,
      date,
    },
  });
}

/**
 * Mark a share settled. Optionally records the matching cash movement so your
 * balances follow:
 *   - "owed_to_you" → a Repayment into `accountId`: the account balance goes up,
 *     but it is not income, and the expense it was shared from still counts only
 *     your own share
 *   - "you_owe"     → an Expense (you paid them back) from `accountId`
 * Settling without recording only clears the ledger, leaving balances untouched.
 */
export async function settleShare(
  userId: string,
  shareId: string,
  opts: { record?: boolean; accountId?: string | null },
): Promise<void> {
  const share = await prisma.expenseShare.findFirst({
    // LIVE_SHARE excludes a share whose linked transaction was soft-deleted —
    // without it, a direct API call could still settle a "phantom" share the
    // UI never shows (loadContactShares/loadContacts already filter these
    // out), recording a real settlement transaction for a purchase that no
    // longer exists. A share nobody is named for belongs to its transaction.
    where: { id: shareId, AND: [{ OR: [{ contact: { userId } }, { transaction: { userId } }] }, LIVE_SHARE] },
    include: { transaction: true, contact: true },
  });
  if (!share) throw new NotFoundError("Share not found");
  if (share.settled) return;

  // Validate the destination account before claiming the settle, so a bad
  // account id never leaves the share marked settled with no transaction
  // recorded to back it.
  let accountId: string | null = null;
  if (opts.record) {
    if (!opts.accountId?.trim()) throw new BadRequestError("Choose an account to record the settlement");
    const account = await prisma.account.findFirst({ where: { id: opts.accountId, userId }, select: { id: true } });
    if (!account) throw new NotFoundError("Account not found");
    accountId = account.id;
  }

  const owed = share.direction !== "you_owe";
  // Paying someone back comes out of the chosen account — refuse it (before
  // the share is claimed as settled) if the account can't cover it.
  if (accountId && !owed) {
    await assertSufficientBalance(userId, [], [{ type: "expense", amount: share.amount, accountId }]);
  }
  const label = share.transaction?.description ?? share.description ?? "shared expense";
  const who = share.contact?.name ?? "Someone";

  await prisma.$transaction(async (db) => {
    // Claim the settle first, conditioned on it still being unsettled. This
    // is the lock: two concurrent settle calls (double-click, two tabs) can't
    // both pass and each record a duplicate settlement transaction.
    const claimed = await db.expenseShare.updateMany({
      where: { id: shareId, settled: false },
      data: { settled: true, settledAt: new Date() },
    });
    if (claimed.count === 0) return; // a concurrent call already settled it

    if (accountId) {
      await db.transaction.create({
        data: {
          userId,
          type: owed ? "repayment" : "expense",
          amount: share.amount,
          description: owed ? `${who} paid back` : `Paid ${who} back`,
          date: new Date(),
          accountId,
          notes: `Settlement for "${label}"`,
        },
      });
    }
  });
}

/** The open entries with one person, and what settling them all comes to. */
export interface NetSettlement {
  owedToYou: number; // paise they owe you
  youOwe: number; // paise you owe them
  net: number; // owedToYou - youOwe; positive: they pay you
  entries: number;
}

/**
 * Settle everything open with one person at once. Each entry is settled as it
 * would be on its own, but the bank movements are recorded together, so the
 * account changes by the net amount actually handed over:
 *   - what they owed you → a Repayment (raises the balance; not income)
 *   - what you owed them → an Expense (the cost of what they paid for you)
 * Settling without recording only clears the ledger.
 */
export async function settleContactNet(
  userId: string,
  contactId: string,
  opts: { record?: boolean; accountId?: string | null },
): Promise<NetSettlement> {
  const contact = await prisma.contact.findFirst({ where: { id: contactId, userId }, select: { id: true, name: true } });
  if (!contact) throw new NotFoundError("Contact not found");
  const open = await prisma.expenseShare.findMany({
    where: { contactId, settled: false, ...LIVE_SHARE },
    select: { id: true, amount: true, direction: true },
  });
  if (open.length === 0) throw new BadRequestError("Nothing to settle with this person");

  const owedToYou = open.filter((s) => s.direction !== "you_owe").reduce((sum, s) => sum + s.amount, 0);
  const youOwe = open.filter((s) => s.direction === "you_owe").reduce((sum, s) => sum + s.amount, 0);
  const result: NetSettlement = { owedToYou, youOwe, net: owedToYou - youOwe, entries: open.length };

  let accountId: string | null = null;
  if (opts.record) {
    if (!opts.accountId?.trim()) throw new BadRequestError("Choose an account to record the settlement");
    const account = await prisma.account.findFirst({ where: { id: opts.accountId, userId }, select: { id: true } });
    if (!account) throw new NotFoundError("Account not found");
    accountId = account.id;
    // Refuse before anything changes if the account can't cover what you pay out.
    await assertSufficientBalance(userId, [], [
      { type: "repayment", amount: owedToYou, accountId },
      { type: "expense", amount: youOwe, accountId },
    ]);
  }

  await prisma.$transaction(async (db) => {
    // Claim the entries first (see settleShare): a concurrent settle can't
    // record the same movements twice.
    const claimed = await db.expenseShare.updateMany({
      where: { id: { in: open.map((s) => s.id) }, settled: false },
      data: { settled: true, settledAt: new Date() },
    });
    if (claimed.count !== open.length) throw new BadRequestError("These entries changed. Try again.");
    if (!accountId) return;
    const base = { userId, date: new Date(), accountId, notes: `Settled up with ${contact.name}` };
    if (owedToYou > 0) {
      await db.transaction.create({ data: { ...base, type: "repayment", amount: owedToYou, description: `${contact.name} paid back` } });
    }
    if (youOwe > 0) {
      await db.transaction.create({ data: { ...base, type: "expense", amount: youOwe, description: `Paid ${contact.name} back` } });
    }
  });
  return result;
}

/** Shares nobody has been named for yet ("Someone"), still owed to you, newest first. */
export async function loadUnassignedShares(userId: string): Promise<ContactShareRow[]> {
  const rows = await prisma.expenseShare.findMany({
    where: { contactId: null, transaction: { userId, deletedAt: null } },
    include: { transaction: { select: { id: true, description: true, date: true } } },
    orderBy: [{ settled: "asc" }, { createdAt: "desc" }],
  });
  return rows.map((s) => ({
    id: s.id,
    amount: s.amount,
    direction: s.direction as ShareDirection,
    settled: s.settled,
    settledAt: s.settledAt ? toISODate(s.settledAt) : null,
    transactionId: s.transaction?.id ?? null,
    description: s.transaction?.description ?? "Shared expense",
    date: s.transaction ? toISODate(s.transaction.date) : toISODate(s.date),
  }));
}

/** Name the person behind a "Someone" share. */
export async function assignShare(userId: string, shareId: string, contactId: string): Promise<void> {
  const share = await prisma.expenseShare.findFirst({
    where: { id: shareId, contactId: null, transaction: { userId, deletedAt: null } },
    select: { id: true, transactionId: true },
  });
  if (!share) throw new NotFoundError("Share not found");
  const contact = await prisma.contact.findFirst({ where: { id: contactId, userId }, select: { id: true } });
  if (!contact) throw new NotFoundError("Contact not found");
  const clash = await prisma.expenseShare.count({ where: { transactionId: share.transactionId, contactId } });
  if (clash > 0) throw new BadRequestError("That person already has a share of this expense");
  await prisma.expenseShare.update({ where: { id: shareId }, data: { contactId } });
}
