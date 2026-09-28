import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  transaction: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), findUniqueOrThrow: vi.fn() },
  transactionTag: { deleteMany: vi.fn() },
  account: { findMany: vi.fn() },
  category: { findFirst: vi.fn() },
  contact: { findMany: vi.fn() },
  expenseShare: { findMany: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock("./db", () => ({ prisma: db }));
import { assertSharesValid, createTransaction, updateTransaction } from "./tx-service";
import { BadRequestError } from "./api";

beforeEach(() => {
  vi.resetAllMocks();
  db.contact.findMany.mockResolvedValue([{ id: "friend" }]);
  db.account.findMany.mockResolvedValue([{ id: "account" }]);
  db.category.findFirst.mockResolvedValue({ id: "category", kind: "expense" });
  // An existing ₹70 expense on the account.
  db.transaction.findFirst.mockResolvedValue({
    id: "transaction", splitGroupId: null, type: "expense", amount: 7000, accountId: "account", transferAccountId: null,
  });
  db.transaction.findMany.mockResolvedValue([]);
  db.expenseShare.findMany.mockResolvedValue([{ contactId: "friend", amount: 6000 }]);
});

describe("share validation", () => {
  it("rejects duplicate contacts instead of creating ambiguous ledger rows", async () => {
    await expect(assertSharesValid("user", [
      { contactId: "friend", amount: 1000 }, { contactId: "friend", amount: 1000 },
    ], 5000)).rejects.toBeInstanceOf(BadRequestError);
  });

  it("allows shares up to the transaction amount", async () => {
    await expect(assertSharesValid("user", [{ contactId: "friend", amount: 5000 }], 5000)).resolves.toBeUndefined();
  });

  it("checks retained shares when an edit reduces the transaction amount", async () => {
    await expect(updateTransaction("user", "transaction", {
      type: "expense", amount: 5000, description: "Dinner", date: "2026-09-18",
      categoryId: "category", accountId: "account",
    })).rejects.toBeInstanceOf(BadRequestError);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});

describe("balance check", () => {
  const expense = (amount: number, accountId = "account") => ({
    type: "expense" as const, amount, description: "Groceries", date: "2026-09-18", categoryId: "category", accountId,
  });
  const account = (type: string, openingBalance: number) => [{ id: "account", name: "HDFC", type, openingBalance }];

  it("refuses spending more than the account holds, naming the account and the amount field", async () => {
    db.account.findMany.mockResolvedValue(account("bank", 30000));
    db.transaction.findMany.mockResolvedValue([{ type: "expense", amount: 10000, accountId: "account", transferAccountId: null }]);
    const err = await createTransaction("user", expense(20001)).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestError);
    expect(err.message).toBe("Not enough balance in HDFC: only ₹200 available.");
    expect(err.fields).toEqual({ amount: err.message });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("lets a credit card go below zero", async () => {
    db.account.findMany.mockResolvedValue(account("credit_card", 0));
    db.$transaction.mockImplementation(async (fn) => fn({ transaction: { create: vi.fn().mockResolvedValue({ id: "new" }) } }));
    await expect(createTransaction("user", expense(50000))).resolves.toBe("new");
  });
});
