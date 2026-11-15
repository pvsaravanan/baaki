import { describe, expect, it } from "vitest";
import { accountsLowered, balanceShortfalls, type GuardedAccount } from "./balance-guard";

const bank = (balance: number): GuardedAccount => ({ id: "bank", name: "HDFC", type: "bank", balance });
const card = (balance: number): GuardedAccount => ({ id: "card", name: "Visa", type: "credit_card", balance });

describe("balanceShortfalls", () => {
  it("allows spending up to exactly the balance", () => {
    expect(balanceShortfalls([], [{ type: "expense", amount: 50000, accountId: "bank" }], [bank(50000)])).toEqual([]);
  });

  it("refuses spending more than the balance, reporting what's available", () => {
    expect(balanceShortfalls([], [{ type: "expense", amount: 50001, accountId: "bank" }], [bank(50000)])).toEqual([
      { accountId: "bank", name: "HDFC", available: 50000 },
    ]);
  });

  it("checks the source account of a transfer, not the destination", () => {
    const move = { type: "transfer", amount: 900, accountId: "bank", transferAccountId: "cash" };
    const cash = { id: "cash", name: "Cash", type: "cash", balance: 0 };
    expect(balanceShortfalls([], [move], [bank(500), cash]).map((s) => s.accountId)).toEqual(["bank"]);
  });

  it("counts the old amount as available when editing", () => {
    // ₹300 left after an existing ₹500 expense: it can grow to ₹800, not more.
    const old = [{ type: "expense", amount: 50000, accountId: "bank" }];
    expect(balanceShortfalls(old, [{ type: "expense", amount: 80000, accountId: "bank" }], [bank(30000)])).toEqual([]);
    expect(balanceShortfalls(old, [{ type: "expense", amount: 80001, accountId: "bank" }], [bank(30000)])).toEqual([
      { accountId: "bank", name: "HDFC", available: 80000 },
    ]);
  });

  it("never blocks a change that doesn't lower the balance, even on an account already below zero", () => {
    const old = [{ type: "expense", amount: 1000, accountId: "bank" }];
    expect(balanceShortfalls(old, old, [bank(-5000)])).toEqual([]);
    expect(balanceShortfalls([], [{ type: "income", amount: 1, accountId: "bank" }], [bank(-5000)])).toEqual([]);
  });

  it("exempts credit card and loan accounts", () => {
    expect(balanceShortfalls([], [{ type: "expense", amount: 99999, accountId: "card" }], [card(0)])).toEqual([]);
    const loan = { id: "loan", name: "Home loan", type: "loan", balance: -100 };
    expect(balanceShortfalls([], [{ type: "expense", amount: 5, accountId: "loan" }], [loan])).toEqual([]);
  });

  it("adds up split parts on the same account", () => {
    const parts = [
      { type: "expense", amount: 300, accountId: "bank" },
      { type: "expense", amount: 300, accountId: "bank" },
    ];
    expect(balanceShortfalls([], parts, [bank(500)]).length).toBe(1);
  });
});

describe("accountsLowered", () => {
  it("lists only accounts whose balance goes down", () => {
    const move = { type: "transfer", amount: 100, accountId: "bank", transferAccountId: "cash" };
    expect(accountsLowered([], [move])).toEqual(["bank"]);
    expect(accountsLowered([move], [move])).toEqual([]);
  });
});
