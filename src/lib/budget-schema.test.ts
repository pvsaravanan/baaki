import { describe, expect, it } from "vitest";
import { budgetSchema } from "./validation";

describe("budgetSchema accounts", () => {
  const base = { year: 2026, month: 10, overallLimit: 5_000_000, categories: [] };

  it("covers all accounts when none are given", () => {
    expect(budgetSchema.parse(base).accountIds).toEqual([]);
  });

  it("keeps the chosen accounts", () => {
    expect(budgetSchema.parse({ ...base, accountIds: ["a1", "a2"] }).accountIds).toEqual(["a1", "a2"]);
  });

  it("rejects an empty account id", () => {
    expect(budgetSchema.safeParse({ ...base, accountIds: [""] }).success).toBe(false);
  });
});
