import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  financialGoal: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  goalContribution: { create: vi.fn() },
  account: { findMany: vi.fn() },
  transaction: { findMany: vi.fn(), create: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock("./db", () => ({ prisma: db }));
import { allocateToGoal, removeFromGoal, updateGoal } from "./goals-service";
import { BadRequestError } from "./api";

const macbook = { id: "macbook", userId: "user", targetAmount: 8_000_000, status: "active" };

/** ₹50,000 in the bank; `goals` are [status, allocated paise] per goal. */
function setup(goals: [string, number][], target = macbook) {
  db.account.findMany.mockResolvedValue([{ id: "bank", openingBalance: 5_000_000, isArchived: false }]);
  db.transaction.findMany.mockResolvedValue([]);
  db.financialGoal.findMany.mockResolvedValue(
    goals.map(([status, allocated], i) => ({ id: `g${i}`, status, contributions: [{ amount: allocated }] })),
  );
  db.financialGoal.findFirst.mockResolvedValue({ ...target, contributions: [{ amount: goals[0]?.[1] ?? 0 }] });
}

beforeEach(() => {
  vi.resetAllMocks();
  db.$transaction.mockImplementation(async (fn: (tx: typeof db) => unknown) => fn(db));
});

describe("allocateToGoal", () => {
  it("records an allocation without creating any transaction", async () => {
    setup([["active", 0]]);
    await allocateToGoal("user", "macbook", 1_000_000);
    expect(db.goalContribution.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ goalId: "macbook", amount: 1_000_000 }),
    });
    expect(db.transaction.create).not.toHaveBeenCalled();
  });

  it("refuses more than is available across all goals", async () => {
    // ₹50,000 actual, ₹40,000 already allocated elsewhere → ₹10,000 available.
    setup([["active", 0], ["active", 4_000_000]]);
    const err = await allocateToGoal("user", "macbook", 1_500_000).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestError);
    expect(err.message).toBe("You only have ₹10,000 available to allocate.");
    expect(err.fields).toEqual({ amount: err.message });
    expect(db.goalContribution.create).not.toHaveBeenCalled();
  });

  it("doesn't count archived goals against what's available", async () => {
    setup([["active", 0], ["archived", 4_500_000]]);
    await expect(allocateToGoal("user", "macbook", 5_000_000)).resolves.toBeUndefined();
  });

  it("marks the goal completed when the allocation reaches the target", async () => {
    setup([["active", 7_000_000]], { ...macbook, targetAmount: 8_000_000 });
    db.account.findMany.mockResolvedValue([{ id: "bank", openingBalance: 9_000_000, isArchived: false }]);
    await allocateToGoal("user", "macbook", 1_000_000);
    expect(db.financialGoal.update).toHaveBeenCalledWith({ where: { id: "macbook" }, data: { status: "achieved" } });
  });

  it("won't allocate to an archived goal", async () => {
    setup([["archived", 0]], { ...macbook, status: "archived" });
    await expect(allocateToGoal("user", "macbook", 100)).rejects.toBeInstanceOf(BadRequestError);
  });

  it("runs the check and the write in one serializable transaction", async () => {
    setup([["active", 0]]);
    await allocateToGoal("user", "macbook", 100);
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
  });
});

describe("removeFromGoal", () => {
  it("records a negative history entry and reopens a completed goal", async () => {
    setup([["achieved", 8_000_000]], { ...macbook, status: "achieved" });
    await removeFromGoal("user", "macbook", 300_000);
    expect(db.goalContribution.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ goalId: "macbook", amount: -300_000 }),
    });
    expect(db.financialGoal.update).toHaveBeenCalledWith({ where: { id: "macbook" }, data: { status: "active" } });
    expect(db.transaction.create).not.toHaveBeenCalled();
  });

  it("refuses removing more than the goal holds", async () => {
    setup([["active", 1_000_000]]);
    await expect(removeFromGoal("user", "macbook", 1_000_001)).rejects.toThrow("This goal only has ₹10,000 allocated.");
  });
});

describe("updateGoal", () => {
  it("completes the goal when the target is lowered to the allocation", async () => {
    setup([["active", 3_200_000]]);
    await updateGoal("user", "macbook", { targetAmount: 3_000_000 });
    expect(db.financialGoal.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ targetAmount: 3_000_000, status: "achieved" }) }),
    );
  });

  it("archives without touching the allocation history", async () => {
    setup([["active", 1_000_000]]);
    await updateGoal("user", "macbook", { status: "archived" });
    expect(db.financialGoal.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "archived" }) }),
    );
    expect(db.goalContribution.create).not.toHaveBeenCalled();
  });

  it("won't restore an archived goal whose money is no longer available", async () => {
    // Archived with ₹20,000; the other goal now holds ₹40,000 of the ₹50,000.
    setup([["archived", 2_000_000], ["active", 4_000_000]], { ...macbook, status: "archived" });
    await expect(updateGoal("user", "macbook", { status: "active" })).rejects.toThrow(
      "Restoring this goal needs ₹20,000 available, but you only have ₹10,000.",
    );
  });

  it("restores an archived goal when the money is still there", async () => {
    setup([["archived", 1_000_000]], { ...macbook, status: "archived" });
    await updateGoal("user", "macbook", { status: "active" });
    expect(db.financialGoal.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "active" }) }),
    );
  });
});

describe("resolveShortfall", () => {
  it("removes exactly the shortfall and records it in the goal's history", async () => {
    // ₹50,000 actual, but ₹60,000 allocated to one goal → ₹10,000 over.
    setup([["active", 6_000_000]]);
    db.financialGoal.findMany
      .mockResolvedValueOnce([{ id: "macbook", status: "active", contributions: [{ amount: 6_000_000 }] }])
      .mockResolvedValueOnce([
        { id: "macbook", name: "Macbook", status: "active", targetAmount: 8_000_000, contributions: [{ amount: 6_000_000 }] },
      ]);
    const { resolveShortfall } = await import("./goals-service");
    expect(await resolveShortfall("user")).toEqual([{ id: "macbook", name: "Macbook", amount: 1_000_000 }]);
    expect(db.goalContribution.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ goalId: "macbook", amount: -1_000_000 }),
    });
    expect(db.transaction.create).not.toHaveBeenCalled();
  });

  it("does nothing when allocations already fit", async () => {
    setup([["active", 1_000_000]]);
    const { resolveShortfall } = await import("./goals-service");
    expect(await resolveShortfall("user")).toEqual([]);
    expect(db.goalContribution.create).not.toHaveBeenCalled();
  });
});
