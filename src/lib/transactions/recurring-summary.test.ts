import { describe, expect, it } from "vitest";
import { expectedPerMonth, sortRules } from "./recurring-summary";

const rule = (over: Partial<Parameters<typeof expectedPerMonth>[0][number]> = {}) => ({
  type: "expense" as const,
  amount: 12_000,
  frequency: "monthly" as const,
  interval: 1,
  isActive: true,
  endDate: null,
  ...over,
});
const TODAY = "2026-11-06";
const expense = (over: Parameters<typeof rule>[0]) => expectedPerMonth([rule(over)], TODAY).expense;

describe("expectedPerMonth", () => {
  it("keeps income and expenses apart, and ignores transfers", () => {
    expect(
      expectedPerMonth([rule(), rule({ type: "income", amount: 50_000 }), rule({ type: "transfer", amount: 9_000 })], TODAY),
    ).toEqual({ income: 50_000, expense: 12_000 });
  });

  it("brings every frequency to an average month", () => {
    expect(expense({ frequency: "yearly" })).toBe(1_000);
    expect(expense({ frequency: "quarterly" })).toBe(4_000);
    expect(expense({ frequency: "weekly" })).toBe(52_000);
    expect(expense({ frequency: "daily" })).toBe(365_000);
  });

  it("allows for an interval", () => {
    expect(expense({ frequency: "monthly", interval: 2 })).toBe(6_000);
    expect(expense({ frequency: "weekly", interval: 2 })).toBe(26_000);
  });

  it("leaves out paused and finished rules", () => {
    expect(expense({ isActive: false })).toBe(0);
    expect(expense({ endDate: "2026-11-05" })).toBe(0);
    expect(expense({ endDate: TODAY })).toBe(12_000);
    expect(expense({ endDate: "2027-01-01" })).toBe(12_000);
  });

  it("is zero with no rules", () => {
    expect(expectedPerMonth([], TODAY)).toEqual({ income: 0, expense: 0 });
  });
});

describe("sortRules", () => {
  const rules = [
    { name: "Rent", amount: 2_000, nextOccurrence: "2026-12-01" },
    { name: "Airtel", amount: 100, nextOccurrence: "2026-11-20" },
    { name: "Netflix", amount: 500, nextOccurrence: "2026-11-10" },
  ];
  const names = (sort: Parameters<typeof sortRules>[1]) => sortRules(rules, sort).map((r) => r.name);

  it("sorts soonest first, largest first, or by name", () => {
    expect(names("next")).toEqual(["Netflix", "Airtel", "Rent"]);
    expect(names("amount")).toEqual(["Rent", "Netflix", "Airtel"]);
    expect(names("name")).toEqual(["Airtel", "Netflix", "Rent"]);
  });

  it("leaves the original list alone", () => {
    sortRules(rules, "name");
    expect(rules[0].name).toBe("Rent");
  });
});
