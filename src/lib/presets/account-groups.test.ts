import { describe, expect, it } from "vitest";
import { accountTotals, groupAccounts } from "./account-groups";

const account = (name: string, type: string, balance = 0) => ({ name, type, balance });

describe("groupAccounts", () => {
  it("puts each type under its heading, in the page's order", () => {
    const groups = groupAccounts([
      account("Card", "credit_card"),
      account("Purse", "cash"),
      account("Paytm", "wallet"),
      account("HDFC", "bank"),
      account("Goal", "savings"),
      account("Home loan", "loan"),
      account("Stocks", "investment"),
      account("Misc", "other"),
    ]);
    expect(groups.map((g) => [g.label, g.accounts.map((a) => a.name)])).toEqual([
      ["Bank Accounts", ["HDFC", "Goal"]],
      ["Wallets", ["Paytm"]],
      ["Cash", ["Purse"]],
      ["Other Accounts", ["Card", "Home loan", "Stocks", "Misc"]],
    ]);
  });

  it("leaves out empty groups and keeps unknown types", () => {
    expect(groupAccounts([])).toEqual([]);
    expect(groupAccounts([account("Old", "something_new", 500)])).toEqual([
      { label: "Other Accounts", accounts: [account("Old", "something_new", 500)], total: 500 },
    ]);
  });

  it("adds up each group, debts included", () => {
    const [other] = groupAccounts([account("Card", "credit_card", -1_000), account("Stocks", "investment", 4_000)]);
    expect(other.total).toBe(3_000);
  });
});

describe("accountTotals", () => {
  it("keeps what's held apart from what's owed", () => {
    expect(accountTotals([{ balance: 5_000 }, { balance: -1_200 }, { balance: 0 }])).toEqual({ held: 5_000, owed: 1_200, net: 3_800 });
    expect(accountTotals([])).toEqual({ held: 0, owed: 0, net: 0 });
  });
});
