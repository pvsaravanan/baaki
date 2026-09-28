import { describe, expect, it } from "vitest";
import {
  actualBalanceChange,
  allocateError,
  allocatedAmount,
  allocationSummary,
  estimatedCompletion,
  goalMoneySpent,
  goalProgress,
  monthlyAllocationPace,
  removeError,
  shortfallPlan,
  statusFor,
  totalAllocated,
} from "./goal-allocation";
import { accountBalance, actualBalance, summarize, type CalcTxn } from "./calculations";

const d = (iso: string) => new Date(`${iso}T12:00:00+05:30`);

describe("available balance", () => {
  it("is the actual balance minus what's allocated", () => {
    // ₹50,000 in the accounts, ₹10,000 + ₹5,000 allocated.
    const allocated = totalAllocated([
      { status: "active", allocated: 1_000_000 },
      { status: "active", allocated: 500_000 },
    ]);
    expect(allocationSummary(5_000_000, allocated)).toEqual({
      actualBalance: 5_000_000,
      totalAllocated: 1_500_000,
      available: 3_500_000,
      shortfall: 0,
    });
  });

  it("ignores goal targets — only allocated money counts", () => {
    expect(totalAllocated([{ status: "active", allocated: 0 }])).toBe(0);
  });

  it("counts completed goals but releases archived ones", () => {
    expect(
      totalAllocated([
        { status: "active", allocated: 100 },
        { status: "achieved", allocated: 200 },
        { status: "archived", allocated: 400 },
      ]),
    ).toBe(300);
  });

  it("sums allocate and remove history into the allocated amount", () => {
    expect(allocatedAmount([{ amount: 1_000_000 }, { amount: -300_000 }])).toBe(700_000);
  });

  it("reports a shortfall when spending pushes the balance below allocations", () => {
    expect(allocationSummary(800_000, 1_000_000)).toMatchObject({ available: -200_000, shortfall: 200_000 });
  });

  it("spending past what's available leaves allocations alone and reports the over-allocation", () => {
    // ₹10,000 actual, ₹8,000 allocated → ₹2,000 safe to spend.
    const allocated = totalAllocated([{ status: "active", allocated: 800_000 }]);
    expect(allocationSummary(1_000_000, allocated).available).toBe(200_000);
    // Spend ₹3,000: actual ₹7,000, still ₹8,000 allocated → over by ₹1,000.
    expect(allocationSummary(700_000, allocated)).toEqual({
      actualBalance: 700_000,
      totalAllocated: 800_000,
      available: -100_000,
      shortfall: 100_000,
    });
  });

  it("doesn't blame goals for a negative balance when nothing is allocated", () => {
    expect(allocationSummary(-50_000, 0).shortfall).toBe(0);
  });
});

describe("allocations are not transactions", () => {
  it("leave account balances and spending totals untouched", () => {
    // Allocation lives only in goal history; the balance and spending math
    // take transactions alone, so there's nothing for an allocation to change.
    const txns: CalcTxn[] = [
      { type: "income", amount: 6_000_000, date: d("2026-09-01"), accountId: "bank" },
      { type: "expense", amount: 1_000_000, date: d("2026-09-05"), accountId: "bank" },
    ];
    const accounts = [{ id: "bank", openingBalance: 0, isArchived: false }];
    expect(actualBalance(accounts, txns)).toBe(5_000_000);
    expect(accountBalance(accounts[0], txns)).toBe(5_000_000);
    expect(summarize(txns).effectiveExpense).toBe(1_000_000);
    const summary = allocationSummary(actualBalance(accounts, txns), 1_000_000);
    expect(summary.actualBalance).toBe(5_000_000);
    expect(summary.available).toBe(4_000_000);
  });

  it("actual balance leaves out archived accounts, like the dashboard", () => {
    const txns: CalcTxn[] = [];
    expect(
      actualBalance(
        [
          { id: "a", openingBalance: 100, isArchived: false },
          { id: "b", openingBalance: 900, isArchived: true },
        ],
        txns,
      ),
    ).toBe(100);
  });
});

describe("over-allocation", () => {
  it("allows up to exactly what's available", () => {
    expect(allocateError(1_000_000, 1_000_000)).toBeNull();
  });

  it("refuses more than is available, saying how much is", () => {
    expect(allocateError(1_500_000, 1_000_000)).toBe("You only have ₹10,000 available to allocate.");
  });

  it("refuses any allocation when nothing is available", () => {
    expect(allocateError(100, 0)).toBe("You have no money available to allocate.");
    expect(allocateError(100, -500)).toBe("You have no money available to allocate.");
  });

  it("refuses removing more than the goal holds", () => {
    expect(removeError(300_000, 1_000_000)).toBeNull();
    expect(removeError(1_000_001, 1_000_000)).toBe("This goal only has ₹10,000 allocated.");
  });

  it("rejects zero amounts", () => {
    expect(allocateError(0, 1000)).not.toBeNull();
    expect(removeError(0, 1000)).not.toBeNull();
  });
});

describe("status and progress", () => {
  it("completes a goal once fully allocated and reopens it below target", () => {
    expect(statusFor("active", 8_000_000, 8_000_000)).toBe("achieved");
    expect(statusFor("achieved", 7_999_999, 8_000_000)).toBe("active");
    expect(statusFor("active", 100, 8_000_000)).toBe("active");
  });

  it("follows target edits after allocating", () => {
    // ₹32,000 allocated: lowering the target to ₹30,000 completes it.
    expect(statusFor("active", 3_200_000, 3_000_000)).toBe("achieved");
    expect(statusFor("achieved", 3_200_000, 8_000_000)).toBe("active");
  });

  it("leaves archived goals archived", () => {
    expect(statusFor("archived", 9_000_000, 100)).toBe("archived");
  });

  it("is allocated / target, capped at 100%", () => {
    expect(goalProgress(3_200_000, 8_000_000)).toBe(40);
    expect(goalProgress(9_000_000, 8_000_000)).toBe(100);
    expect(goalProgress(0, 0)).toBe(0);
  });
});

describe("insights", () => {
  const today = d("2026-09-29");

  it("needs a few weeks of history before estimating a pace", () => {
    expect(monthlyAllocationPace([{ amount: 1_000_000, date: d("2026-09-15") }], today)).toBeNull();
    expect(monthlyAllocationPace([], today)).toBeNull();
  });

  it("averages net allocations per month over the recent window", () => {
    const history = [
      { amount: 1_500_000, date: d("2026-07-01") },
      { amount: 700_000, date: d("2026-08-15") },
      { amount: 1_000_000, date: d("2026-09-29") },
    ];
    // ₹32,000 over 90 days ≈ ₹10,819/month.
    expect(monthlyAllocationPace(history, today)).toBe(Math.round(3_200_000 / (90 / 30.44)));
  });

  it("has no pace when allocations were net removed", () => {
    const history = [
      { amount: 500_000, date: d("2026-07-01") },
      { amount: -600_000, date: d("2026-09-01") },
    ];
    expect(monthlyAllocationPace(history, today)).toBeNull();
  });

  it("estimates completion from the pace", () => {
    // ₹48,000 remaining at ₹8,000/month → 6 months.
    const eta = estimatedCompletion(4_800_000, 800_000, today)!;
    expect(eta.getFullYear()).toBe(2027);
    expect(eta.getMonth()).toBe(2); // March
    expect(estimatedCompletion(0, 800_000, today)).toBeNull();
    expect(estimatedCompletion(100, null, today)).toBeNull();
  });
});

describe("spending into goal money", () => {
  const accounts = [
    { id: "bank", isArchived: false },
    { id: "cash", isArchived: false },
    { id: "old", isArchived: true },
  ];
  // ₹2,517.13 actual, ₹2,500 allocated → ₹17.13 available.
  const summary = { available: 1_713, totalAllocated: 250_000 };

  it("is nothing while the spend fits in what's available", () => {
    const change = actualBalanceChange([], [{ type: "expense", amount: 1_713, accountId: "bank" }], accounts);
    expect(change).toBe(-1_713);
    expect(goalMoneySpent(summary, change)).toBe(0);
  });

  it("is the part of the spend beyond what's available", () => {
    const change = actualBalanceChange([], [{ type: "expense", amount: 50_000, accountId: "bank" }], accounts);
    expect(goalMoneySpent(summary, change)).toBe(50_000 - 1_713);
  });

  it("never exceeds what's allocated", () => {
    expect(goalMoneySpent(summary, -1_000_000)).toBe(250_000);
  });

  it("handles several expenses in a row, each against the balance the last one left", () => {
    // Start: ₹2,517.13 actual, ₹2,500 allocated.
    let actual = 251_713;
    const allocated = 250_000;
    const fromGoalsFor = (spend: number) => {
      const s = allocationSummary(actual, allocated);
      const taken = goalMoneySpent(s, -spend);
      actual -= spend;
      return taken;
    };
    expect(fromGoalsFor(1_000)).toBe(0); // ₹10 fits in the ₹17.13 available
    expect(fromGoalsFor(50_000)).toBe(50_000 - 713); // ₹7.13 was still free
    expect(allocationSummary(actual, allocated).shortfall).toBe(49_287);
    expect(fromGoalsFor(30_000)).toBe(30_000); // already over: all of it is goal money
    expect(allocationSummary(actual, allocated).shortfall).toBe(79_287);
    // A spend bigger than everything left: only what physically remains was reserved.
    expect(fromGoalsFor(500_000)).toBe(170_713);
    expect(allocationSummary(actual, allocated).shortfall).toBe(allocated);
  });

  it("counts only the increase when editing", () => {
    const before = [{ type: "expense", amount: 10_000, accountId: "bank" }];
    const after = [{ type: "expense", amount: 11_000, accountId: "bank" }];
    expect(actualBalanceChange(before, after, accounts)).toBe(-1_000);
  });

  it("ignores transfers between your accounts, and archived accounts", () => {
    expect(actualBalanceChange([], [{ type: "transfer", amount: 90_000, accountId: "bank", transferAccountId: "cash" }], accounts)).toBe(0);
    expect(actualBalanceChange([], [{ type: "expense", amount: 90_000, accountId: "old" }], accounts)).toBe(0);
  });

  it("is nothing when no money is allocated", () => {
    expect(goalMoneySpent({ available: 0, totalAllocated: 0 }, -5_000)).toBe(0);
  });
});

describe("shortfallPlan", () => {
  it("takes it all from a single goal", () => {
    expect(shortfallPlan([{ id: "mac", name: "Macbook", allocated: 250_000 }], 48_287)).toEqual([
      { id: "mac", name: "Macbook", amount: 48_287 },
    ]);
  });

  it("shares it in proportion across goals, to the paisa", () => {
    const plan = shortfallPlan(
      [
        { id: "a", name: "A", allocated: 600_000 },
        { id: "b", name: "B", allocated: 300_000 },
        { id: "c", name: "C", allocated: 100_001 },
      ],
      100_000,
    );
    expect(plan.reduce((sum, p) => sum + p.amount, 0)).toBe(100_000);
    expect(plan.find((p) => p.id === "a")!.amount).toBeGreaterThan(plan.find((p) => p.id === "b")!.amount);
  });

  it("never removes more than a goal holds, or more than is allocated", () => {
    expect(shortfallPlan([{ id: "a", name: "A", allocated: 500 }], 9_999)).toEqual([{ id: "a", name: "A", amount: 500 }]);
  });

  it("is empty when there's no shortfall or nothing allocated", () => {
    expect(shortfallPlan([{ id: "a", name: "A", allocated: 500 }], 0)).toEqual([]);
    expect(shortfallPlan([{ id: "a", name: "A", allocated: 0 }], 100)).toEqual([]);
  });
});
