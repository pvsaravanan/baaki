import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  expenseShare: { findFirst: vi.fn(), updateMany: vi.fn() },
  account: { findFirst: vi.fn() },
  transaction: { create: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock("./db", () => ({ prisma: db }));
import { settleShare } from "./contacts-service";
import { BadRequestError, NotFoundError } from "./api";

beforeEach(() => {
  vi.resetAllMocks();
  db.expenseShare.findFirst.mockResolvedValue({
    id: "share", settled: false, amount: 5000, direction: "owed_to_you",
    transaction: null, description: "Dinner", contact: { name: "Friend" },
  });
  db.expenseShare.updateMany.mockResolvedValue({ count: 1 });
  db.account.findFirst.mockResolvedValue({ id: "account" });
  db.$transaction.mockImplementation((fn) => fn(db));
});

describe("settleShare", () => {
  it.each([undefined, null, ""])("requires an account when recording money (%s)", async (accountId) => {
    await expect(settleShare("user", "share", { record: true, accountId })).rejects.toBeInstanceOf(BadRequestError);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("rejects an account the user does not own before settlement", async () => {
    db.account.findFirst.mockResolvedValue(null);
    await expect(settleShare("user", "share", { record: true, accountId: "foreign" })).rejects.toBeInstanceOf(NotFoundError);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("allows ledger-only settlement without an account", async () => {
    await settleShare("user", "share", { record: false });
    expect(db.expenseShare.updateMany).toHaveBeenCalledOnce();
    expect(db.transaction.create).not.toHaveBeenCalled();
  });

  it("records the cash movement once when the settlement is claimed", async () => {
    await settleShare("user", "share", { record: true, accountId: "account" });
    expect(db.transaction.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: "user", accountId: "account", amount: 5000, type: "income" }) });
    db.expenseShare.updateMany.mockResolvedValue({ count: 0 });
    await settleShare("user", "share", { record: true, accountId: "account" });
    expect(db.transaction.create).toHaveBeenCalledOnce();
  });
});
