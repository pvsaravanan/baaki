import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  transaction: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), findUniqueOrThrow: vi.fn() },
  transactionTag: { deleteMany: vi.fn() },
  account: { findMany: vi.fn() },
  category: { findFirst: vi.fn() },
}));
vi.mock("./db", () => ({ prisma: db }));
import { createTransaction } from "./tx-service";
import { BadRequestError } from "./api";

beforeEach(() => {
  vi.resetAllMocks();
  db.account.findMany.mockResolvedValue([{ id: "account" }]);
  db.category.findFirst.mockResolvedValue({ id: "category", kind: "expense" });
  // An existing ₹70 expense on the account.
  db.transaction.findFirst.mockResolvedValue({
    id: "transaction", type: "expense", amount: 7000, accountId: "account", transferAccountId: null,
  });
  db.transaction.findMany.mockResolvedValue([]);
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
    expect(db.transaction.create).not.toHaveBeenCalled();
  });

  it("lets a credit card go below zero", async () => {
    db.account.findMany.mockResolvedValue(account("credit_card", 0));
    db.transaction.create.mockResolvedValue({ id: "new" });
    await expect(createTransaction("user", expense(50000))).resolves.toBe("new");
  });
});
