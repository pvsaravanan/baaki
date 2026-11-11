/** Convert Prisma rows into serialized DTOs (see types.ts). */
import type {
  Account,
  Category,
  RecurringTransaction,
  SplitShare,
  Tag,
  Transaction,
  TransactionTag,
} from "@/generated/prisma/client";
import { toISODate } from "./dates";
import type {
  AccountDTO,
  CategoryDTO,
  RecurringDTO,
  SplitDTO,
  TagDTO,
  TransactionDTO,
} from "./types";
import type {
  AccountType,
  CategoryKind,
  Frequency,
  TransactionType,
} from "./constants";

export function serializeAccount(a: Account, balance: number): AccountDTO {
  return {
    id: a.id,
    name: a.name,
    type: a.type as AccountType,
    openingBalance: a.openingBalance,
    color: a.color,
    icon: a.icon,
    isArchived: a.isArchived,
    sortOrder: a.sortOrder,
    balance,
  };
}

export function serializeCategory(c: Category): CategoryDTO {
  return {
    id: c.id,
    name: c.name,
    icon: c.icon,
    color: c.color,
    kind: c.kind as CategoryKind,
    monthlyBudget: c.monthlyBudget,
    parentId: c.parentId,
    isActive: c.isActive,
    systemKey: c.systemKey,
    sortOrder: c.sortOrder,
  };
}

export function serializeTag(t: Tag): TagDTO {
  return { id: t.id, name: t.name, color: t.color };
}

/** What every transaction read includes, for serializeTransaction. */
export const TXN_INCLUDE = {
  tags: { include: { tag: true } },
  splits: { orderBy: { createdAt: "asc" } },
} as const;

type TxnWithTags = Transaction & {
  tags?: (TransactionTag & { tag: Tag })[];
  splits?: SplitShare[];
};

export function serializeSplit(s: SplitShare): SplitDTO {
  return {
    id: s.id,
    name: s.name,
    amount: s.amount,
    settledAt: s.settledAt ? toISODate(s.settledAt) : null,
    settledAccountId: s.settledAccountId,
  };
}

export function serializeTransaction(t: TxnWithTags): TransactionDTO {
  return {
    id: t.id,
    type: t.type as TransactionType,
    amount: t.amount,
    description: t.description,
    merchant: t.merchant,
    date: toISODate(t.date),
    categoryId: t.categoryId,
    accountId: t.accountId,
    transferAccountId: t.transferAccountId,
    notes: t.notes,
    recurringId: t.recurringId,
    tags: t.tags?.map((tt) => tt.tag.name) ?? [],
    splits: t.splits?.map(serializeSplit) ?? [],
  };
}

export function serializeRecurring(r: RecurringTransaction): RecurringDTO {
  return {
    id: r.id,
    name: r.name,
    type: r.type as "expense" | "income" | "transfer",
    amount: r.amount,
    categoryId: r.categoryId,
    accountId: r.accountId,
    transferAccountId: r.transferAccountId,
    notes: r.notes,
    frequency: r.frequency as Frequency,
    interval: r.interval,
    startDate: toISODate(r.startDate),
    endDate: r.endDate ? toISODate(r.endDate) : null,
    nextOccurrence: toISODate(r.nextOccurrence),
    lastPostedDate: r.lastPostedDate ? toISODate(r.lastPostedDate) : null,
    isActive: r.isActive,
    autoPost: r.autoPost,
  };
}
