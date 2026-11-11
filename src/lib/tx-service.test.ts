import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  transaction: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), findUniqueOrThrow: vi.fn() },
  transactionTag: { deleteMany: vi.fn() },
  account: { findMany: vi.fn() },
  category: { findFirst: vi.fn() },
  splitShare: { findMany: vi.fn(), updateMany: vi.fn() },
}));
vi.mock("./db", () => ({ prisma: db }));
import { createTransaction, unsettleSplits } from "./tx-service";
import { transactionSchema } from "./validation";
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
  db.splitShare.findMany.mockResolvedValue([]);
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

describe("split expenses", () => {
  const account = [{ id: "account", name: "HDFC", type: "bank", openingBalance: 0 }];

  it("counts money paid back into an account toward its balance", async () => {
    db.account.findMany.mockResolvedValue(account);
    // ₹400 came back for an earlier split: that's all there is to spend.
    db.splitShare.findMany.mockResolvedValue([{ amount: 40000, settledAccountId: "account" }]);
    db.transaction.create.mockResolvedValue({ id: "new" });
    const spend = (amount: number) =>
      createTransaction("user", { type: "expense", amount, description: "Lunch", date: "2026-09-18", categoryId: "category", accountId: "account" });
    await expect(spend(40000)).resolves.toBe("new");
    await expect(spend(40001)).rejects.toThrow("only ₹400 available");
  });

  it("refuses a split that adds up to more than the amount, and splitting anything but an expense", () => {
    const base = { type: "expense", amount: 1000, description: "Dinner", date: "2026-09-18", categoryId: "c", accountId: "a" };
    expect(transactionSchema.safeParse({ ...base, splits: [{ name: "Asha", amount: 1000 }] }).success).toBe(true);
    expect(transactionSchema.safeParse({ ...base, splits: [{ name: "Asha", amount: 600 }, { name: "Ravi", amount: 401 }] }).success).toBe(false);
    expect(transactionSchema.safeParse({ ...base, type: "income", splits: [{ name: "Asha", amount: 100 }] }).success).toBe(false);
  });

  it("won't undo a settle that would take the account below zero", async () => {
    // The ₹400 paid back was spent since: the account holds nothing else.
    db.splitShare.findMany
      .mockResolvedValueOnce([{ id: "share", amount: 40000, settledAccountId: "account" }])
      .mockResolvedValueOnce([{ amount: 40000, settledAccountId: "account" }]);
    db.account.findMany.mockResolvedValue(account);
    db.transaction.findMany.mockResolvedValue([{ type: "expense", amount: 40000, accountId: "account", transferAccountId: null }]);
    await expect(unsettleSplits("user", ["share"])).rejects.toThrow("HDFC would go below ₹0");
    expect(db.splitShare.updateMany).not.toHaveBeenCalled();
  });
});
