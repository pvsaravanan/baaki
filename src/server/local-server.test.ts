import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", async () => (await import("@/test/memory-db")).memoryDb());

import { handle, loadPage, matchRoute } from "./local-server";
import type { AccountDTO, CategoryDTO } from "@/lib/types";
import { monthKeyOf } from "@/lib/dates";

async function call<T>(method: string, url: string, body?: unknown): Promise<{ status: number; data: T }> {
  const res = await handle(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, data: (await res.json()) as T };
}

describe("route matching", () => {
  it("prefers a fixed path over a parameter at the same depth", () => {
    expect(matchRoute("/api/transactions/bulk-delete")?.params).toEqual({});
    expect(matchRoute("/api/transactions/abc123")?.params).toEqual({ id: "abc123" });
    expect(matchRoute("/api/goals/resolve-shortfall")?.params).toEqual({});
  });

  it("reads nested parameters", () => {
    expect(matchRoute("/api/transactions/t1/restore")?.params).toEqual({ id: "t1" });
    expect(matchRoute("/api/contacts/c1/shares")?.params).toEqual({ id: "c1" });
  });

  it("finds nothing for unknown paths", () => {
    expect(matchRoute("/api/nope")).toBeNull();
    expect(matchRoute("/api/accounts/a/b/c")).toBeNull();
  });
});

describe("the on-device app", () => {
  it("sets up a new phone with starter accounts and categories", async () => {
    const { data } = await call<{ accounts: AccountDTO[] }>("GET", "/api/accounts");
    expect(data.accounts.map((a) => a.name)).toEqual(["Primary Bank", "Cash"]);
    const shell = await loadPage("shell", {});
    expect(shell.categories.length).toBeGreaterThan(10);
    expect(shell.preference.appLock).toBe(false);
  });

  it("answers unknown routes and methods like a server would", async () => {
    expect((await call("GET", "/api/nope")).status).toBe(404);
    expect((await call("PUT", "/api/accounts")).status).toBe(405);
    const bad = await call<{ fields: Record<string, string> }>("POST", "/api/transactions", { type: "expense" });
    expect(bad.status).toBe(422);
    expect(bad.data.fields.amount).toBeTruthy();
  });

  it("backs up everything and restores it exactly", async () => {
    const shell = await loadPage("shell", {});
    const bank = shell.accounts[0];
    const cat = (key: string) => shell.categories.find((c: CategoryDTO) => c.systemKey === key)!.id;
    const today = new Date().toISOString().slice(0, 10);

    expect((await call("POST", "/api/transactions", {
      type: "income", amount: 5_000_000, description: "Salary", date: today, categoryId: cat("salary"), accountId: bank.id,
    })).status).toBe(201);
    const { data: people } = await call<{ contacts: { id: string }[] }>("POST", "/api/contacts", { name: "Asha" });
    expect((await call("POST", "/api/transactions", {
      type: "expense", amount: 240_000, description: "Dinner", date: today, categoryId: cat("food"), accountId: bank.id,
      tags: ["friends"], shares: [{ contactId: people.contacts[0].id, amount: 120_000 }],
    })).status).toBe(201);
    expect((await call("POST", "/api/goals", { name: "Trip", targetAmount: 1_000_000 })).status).toBe(201);
    await call("PATCH", "/api/user", { name: "Priya" });

    const exported = await handle("/api/export?format=json");
    const backup = await exported.json();
    expect(exported.headers.get("content-disposition")).toMatch(/baaki-backup-/);

    // Change things, then restore.
    await call("POST", "/api/transactions", {
      type: "expense", amount: 5_000, description: "Tea", date: today, categoryId: cat("food"), accountId: bank.id,
    });
    await call("PATCH", "/api/user", { name: "Someone else" });
    const restored = await call<{ transactions: number }>("POST", "/api/backup/restore", backup);
    expect(restored).toEqual({ status: 200, data: { accounts: 2, transactions: 2 } });

    const again = await (await handle("/api/export?format=json")).json();
    expect({ ...again, exportedAt: null }).toEqual({ ...backup, exportedAt: null });
    const after = await loadPage("shell", {});
    expect(after.user.name).toBe("Priya");
    expect(after.contacts[0]).toMatchObject({ name: "Asha" });
  });

  it("leaves everything as it was when a backup file is damaged", async () => {
    const before = await (await handle("/api/export?format=json")).json();
    const broken = { ...before, transactions: [{ ...before.transactions[0], amount: "lots" }] };
    const res = await call<{ error: string }>("POST", "/api/backup/restore", broken);
    expect(res.status).toBe(400);
    expect(res.data.error).toMatch(/isn't a baaki backup/);
    const after = await (await handle("/api/export?format=json")).json();
    expect({ ...after, exportedAt: null }).toEqual({ ...before, exportedAt: null });
  });

  it("imports a bank statement once, skipping rows already imported", async () => {
    const shell = await loadPage("shell", {});
    const statement = {
      records: [
        { Date: "01/09/2026", Narration: "SALARY SEPT", Withdrawal: "", Deposit: "60,000.00" },
        { Date: "03/09/2026", Narration: "SWIGGY ORDER", Withdrawal: "450.00", Deposit: "" },
      ],
      mapping: { date: "Date", description: "Narration", withdrawal: "Withdrawal", deposit: "Deposit" },
      defaultAccountId: shell.accounts[0].id,
      dateFormat: "DD/MM/YYYY",
      commit: true,
    };
    const first = await call<{ summary: { imported: number } }>("POST", "/api/import", statement);
    expect(first.data.summary.imported).toBe(2);
    const again = await call<{ summary: { imported: number; duplicates: number } }>("POST", "/api/import", statement);
    expect(again.data.summary).toMatchObject({ imported: 0, duplicates: 2 });
  });

  it("imports the baaki website's backup file", async () => {
    const website = {
      exportedAt: "2026-09-20T10:00:00.000Z",
      app: "baaki",
      version: 1,
      transactions: [
        {
          id: "t1", userId: "web-user", type: "expense", amount: 45_000, description: "Groceries", merchant: null,
          date: "2026-09-18", categoryId: "c1", accountId: "a1", transferAccountId: null, paymentMethod: "upi",
          notes: null, recurringId: null, splitGroupId: null, createdAt: "2026-09-18T08:00:00.000Z",
          updatedAt: "2026-09-18T08:00:00.000Z", deletedAt: null, tags: ["home"],
        },
      ],
      categories: [
        {
          id: "c1", userId: "web-user", name: "Food", icon: "restaurant", color: "#c47a7a", kind: "expense",
          monthlyBudget: null, parentId: null, isActive: true, isSystem: true, systemKey: "food", sortOrder: 0,
          createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      accounts: [
        {
          id: "a1", userId: "web-user", name: "HDFC", type: "bank", openingBalance: 1_000_000, color: "#0d9488",
          icon: "payment", isArchived: false, sortOrder: 0, createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      budgets: [
        {
          id: "b1", userId: "web-user", year: 2026, month: 9, overallLimit: 2_000_000,
          createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z",
          categories: [{ id: "bc1", budgetId: "b1", categoryId: "c1", limit: 800_000 }],
        },
      ],
      goals: [
        {
          id: "g1", userId: "web-user", name: "Laptop", icon: "profits", color: "#0d9488", targetAmount: 8_000_000,
          targetDate: "2027-03-01", accountId: null, status: "active", createdAt: "2026-02-01T00:00:00.000Z",
          updatedAt: "2026-02-01T00:00:00.000Z",
          contributions: [{ id: "gc1", goalId: "g1", amount: 200_000, date: "2026-02-01T00:00:00.000Z", note: null, createdAt: "2026-02-01T00:00:00.000Z" }],
        },
      ],
      recurring: [],
      tags: [{ id: "tag1", userId: "web-user", name: "home", color: "#64748b" }],
    };
    const res = await call("POST", "/api/backup/restore", website);
    expect(res).toEqual({ status: 200, data: { accounts: 1, transactions: 1 } });

    const shell = await loadPage("shell", {});
    expect(shell.accounts).toHaveLength(1);
    expect(shell.accounts[0]).toMatchObject({ name: "HDFC", balance: 1_000_000 - 45_000 });
    expect(shell.preference.defaultAccountId).toBe("a1");
    expect(shell.goalMoney.summary.totalAllocated).toBe(200_000);
    const { data } = await call<{ transactions: { date: string; tags: string[] }[] }>("GET", "/api/transactions");
    expect(data.transactions[0]).toMatchObject({ date: "2026-09-18", tags: ["home"] });
  });
  it("lists a transfer under both of its accounts", async () => {
    await call("POST", "/api/accounts", { name: "Transfer from", type: "bank", openingBalance: 100_000 });
    await call("POST", "/api/accounts", { name: "Transfer to", type: "cash" });
    const { data: list } = await call<{ accounts: AccountDTO[] }>("GET", "/api/accounts");
    const a = list.accounts.find((x) => x.name === "Transfer from")!;
    const b = list.accounts.find((x) => x.name === "Transfer to")!;
    const today = new Date().toISOString().slice(0, 10);
    expect((await call("POST", "/api/transactions", {
      type: "transfer", amount: 25_000, description: "Move to cash", date: today, accountId: a.id, transferAccountId: b.id,
    })).status).toBe(201);

    for (const id of [a.id, b.id]) {
      const { data } = await call<{ transactions: { description: string }[] }>("GET", `/api/transactions?accountId=${id}`);
      expect(data.transactions.map((t) => t.description)).toEqual(["Move to cash"]);
    }
    const shell = await loadPage("shell", {});
    const balance = (id: string) => shell.accounts.find((x: AccountDTO) => x.id === id)!.balance;
    expect(balance(a.id)).toBe(75_000);
    expect(balance(b.id)).toBe(25_000);

    const { perAccount } = await loadPage("reports", {});
    const count = (id: string) => perAccount.find((r: { accountId: string }) => r.accountId === id)?.count;
    expect(count(a.id)).toBe(1);
    expect(count(b.id)).toBe(1);
  });
  it("counts budget spending only in the accounts the budget covers", async () => {
    await call("POST", "/api/accounts", { name: "Budget A", type: "bank", openingBalance: 1_000_000 });
    await call("POST", "/api/accounts", { name: "Budget B", type: "cash", openingBalance: 1_000_000 });
    const { data: list } = await call<{ accounts: AccountDTO[] }>("GET", "/api/accounts");
    const a = list.accounts.find((x) => x.name === "Budget A")!;
    const b = list.accounts.find((x) => x.name === "Budget B")!;
    const shell = await loadPage("shell", {});
    const food = shell.categories.find((c: CategoryDTO) => c.kind !== "income")!;
    const today = new Date().toISOString().slice(0, 10);
    for (const [account, amount] of [[a, 10_000], [b, 30_000]] as const) {
      expect((await call("POST", "/api/transactions", {
        type: "expense", amount, description: "Budget test", date: today, categoryId: food.id, accountId: account.id,
      })).status).toBe(201);
    }

    const { year, month } = monthKeyOf(new Date());
    const save = (accountIds: string[]) =>
      call("PUT", "/api/budgets", { year, month, overallLimit: 100_000, categories: [{ categoryId: food.id, limit: 50_000 }], accountIds });
    const spent = async () => {
      const { budget } = await loadPage("budgets", {});
      return { overall: budget.overallSpent, line: budget.lines.find((l) => l.categoryId === food.id)!.spent, accountIds: budget.accountIds };
    };

    // No accounts chosen: every account counts.
    await save([]);
    const all = await spent();
    expect(all.accountIds).toEqual([]);
    expect(all.overall).toBeGreaterThanOrEqual(40_000);

    // One account, then several added together.
    await save([a.id]);
    expect(await spent()).toEqual({ overall: 10_000, line: 10_000, accountIds: [a.id] });
    await save([b.id]);
    expect((await spent()).overall).toBe(30_000);
    await save([a.id, b.id]);
    expect(await spent()).toMatchObject({ overall: 40_000, line: 40_000 });

    // Accounts that aren't the user's are ignored, which leaves all accounts.
    await save(["not-my-account"]);
    expect((await spent()).accountIds).toEqual([]);

    // The scope survives a backup and restore.
    await save([a.id, b.id]);
    const backup = await (await handle("/api/export?format=json")).json();
    expect(backup.budgetAccounts).toHaveLength(2);
    expect((await call("POST", "/api/backup/restore", backup)).status).toBe(200);
    expect((await spent()).accountIds.sort()).toEqual([a.id, b.id].sort());
  });
  it("shows what an income category received, not spending", async () => {
    const created = await call<{ categories: CategoryDTO[] }>("POST", "/api/categories", { name: "Bank Interest", kind: "income" });
    expect(created.status).toBe(201);
    const interest = created.data.categories.find((c) => c.name === "Bank Interest")!;
    const { data: list } = await call<{ accounts: AccountDTO[] }>("GET", "/api/accounts");
    const today = new Date().toISOString().slice(0, 10);
    expect((await call("POST", "/api/transactions", {
      type: "income", amount: 4_800, description: "Interest", date: today, categoryId: interest.id, accountId: list.accounts[0].id,
    })).status).toBe(201);

    const { detail } = await loadPage("category", { id: interest.id });
    expect(detail).toMatchObject({ kind: "income", currentMonthSpent: 4_800, totalSpent: 4_800, transactionCount: 1, budget: null });
    expect(detail!.topMerchants).toEqual([{ label: "Interest", total: 4_800, count: 1 }]);
    expect(detail!.shareOfMonthExpenses).toBeGreaterThan(0);

    // An expense category still measures spending.
    const shell = await loadPage("shell", {});
    const expenseCat = shell.categories.find((c: CategoryDTO) => c.kind === "expense")!;
    expect((await loadPage("category", { id: expenseCat.id })).detail!.kind).toBe("expense");
  });

  it("counts only your share of a split, and takes the repayment in without making it income", async () => {
    const shell = await loadPage("shell", {});
    const bank = shell.accounts[0];
    const food = shell.categories.find((c: CategoryDTO) => c.systemKey === "food")!.id;
    const today = new Date().toISOString().slice(0, 10);
    const balance = async () => (await loadPage("shell", {})).accounts.find((a: AccountDTO) => a.id === bank.id)!.balance;
    await call("POST", "/api/transactions", {
      type: "income", amount: 1_000_000, description: "Pay", date: today, categoryId: shell.categories.find((c: CategoryDTO) => c.kind === "income")!.id, accountId: bank.id,
    });
    const start = await balance();
    const before = (await loadPage("dashboard", {})).analytics.current;
    const incomeBefore = before.income;
    const totalsBefore = (await call<{ totals: { income: number; expense: number } }>("GET", "/api/transactions")).data.totals;

    // Split ₹898.60 with no one named: your share is ₹449.30.
    const made = await call<{ transaction: { id: string; shares: { id: string; contactName: string }[] } }>(
      "POST", "/api/transactions",
      { type: "expense", amount: 89_860, description: "Train tickets", date: today, categoryId: food, accountId: bank.id, shares: [{ amount: 44_930 }] },
    );
    expect(made.status).toBe(201);
    expect(made.data.transaction.shares[0].contactName).toBe("Someone");
    expect(await balance()).toBe(start - 89_860);

    const dash = async () => (await loadPage("dashboard", {})).analytics.current;
    expect((await dash()).effectiveExpense).toBe(before.effectiveExpense + 44_930);

    // It waits under "Someone" until paid; naming the person is optional.
    const waiting = await loadPage("people", {});
    expect(waiting.someone).toHaveLength(1);
    const shareId = waiting.someone[0].id;

    const settled = await call("POST", `/api/shares/${shareId}/settle`, { record: true, accountId: bank.id });
    expect(settled.status).toBe(200);
    expect(await balance()).toBe(start - 44_930);
    const after = await dash();
    expect(after.income).toBe(incomeBefore);
    expect(after.effectiveExpense).toBe(before.effectiveExpense + 44_930);

    // The repayment is in the list, and can't be edited on its own.
    const list = await call<{ transactions: { id: string; type: string }[]; totals: { income: number; expense: number } }>("GET", "/api/transactions");
    const repayment = list.data.transactions.find((t) => t.type === "repayment")!;
    expect(list.data.totals).toEqual({ income: totalsBefore.income, expense: totalsBefore.expense + 44_930 });
    expect((await call("DELETE", `/api/transactions/${repayment.id}`)).status).toBe(400);
  });

  it("lets you name the person behind a share later", async () => {
    const shell = await loadPage("shell", {});
    const bank = shell.accounts[0];
    const food = shell.categories.find((c: CategoryDTO) => c.systemKey === "food")!.id;
    const today = new Date().toISOString().slice(0, 10);
    await call("POST", "/api/transactions", {
      type: "income", amount: 1_000_000, description: "Pay", date: today, categoryId: shell.categories.find((c: CategoryDTO) => c.kind === "income")!.id, accountId: bank.id,
    });
    await call("POST", "/api/transactions", {
      type: "expense", amount: 20_000, description: "Cab", date: today, categoryId: food, accountId: bank.id, shares: [{ amount: 10_000 }],
    });
    const { data: people } = await call<{ contacts: { id: string; name: string }[] }>("POST", "/api/contacts", { name: "Mohammed" });
    const share = (await loadPage("people", {})).someone.find((s: { description: string }) => s.description === "Cab")!;
    const named = await call<{ someone: unknown[]; contacts: { name: string; owedToYou: number }[] }>(
      "PATCH", `/api/shares/${share.id}`, { contactId: people.contacts.find((c) => c.name === "Mohammed")!.id },
    );
    expect(named.status).toBe(200);
    expect(named.data.someone.find((s) => (s as { id: string }).id === share.id)).toBeUndefined();
    expect(named.data.contacts.find((c) => c.name === "Mohammed")?.owedToYou).toBe(10_000);
  });
});
