import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  transaction: { findFirst: vi.fn(), update: vi.fn(), findUniqueOrThrow: vi.fn() },
  transactionTag: { deleteMany: vi.fn() },
  account: { findMany: vi.fn() },
  category: { findFirst: vi.fn() },
  contact: { findMany: vi.fn() },
  expenseShare: { findMany: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock("./db", () => ({ prisma: db }));
import { assertSharesValid, updateTransaction } from "./tx-service";
import { BadRequestError } from "./api";

beforeEach(() => {
  vi.resetAllMocks();
  db.contact.findMany.mockResolvedValue([{ id: "friend" }]);
  db.account.findMany.mockResolvedValue([{ id: "account" }]);
  db.category.findFirst.mockResolvedValue({ id: "category", kind: "expense" });
  db.transaction.findFirst.mockResolvedValue({ id: "transaction", splitGroupId: null });
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
