import { describe, expect, it, vi } from "vitest";
import { readdirSync } from "node:fs";
import { join, sep } from "node:path";

vi.mock("@/lib/db", async () => (await import("@/test/memory-db")).memoryDb());

import { handle, loadPage, matchRoute } from "./local-server";
import type { AccountDTO, CategoryDTO, RecurringDTO } from "@/lib/types";
import { addDays, monthKeyOf, toISODate } from "@/lib/dates";

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
  });

  it("reads nested parameters", () => {
    expect(matchRoute("/api/transactions/t1/restore")?.params).toEqual({ id: "t1" });
  });

  it("answers every route file (run `npm run generate` after adding one)", () => {
    const files = readdirSync(join(__dirname, "api"), { recursive: true, encoding: "utf8" })
      .filter((f) => f.endsWith("route.ts"))
      .map((f) => "/api/" + f.split(sep).slice(0, -1).join("/").replace(/\[(\w+)\]/g, "x"));
    expect(files).not.toHaveLength(0);
    for (const path of files) expect(matchRoute(path), path).not.toBeNull();
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

  it("sets the profile picture to one of the listed pictures, or none", async () => {
    const chosen = await call<{ user: { avatarUrl: string | null } }>("PATCH", "/api/user", { avatar: "peep-08" });
    expect(chosen.status).toBe(200);
    expect(chosen.data.user.avatarUrl).toBe("avatar:peep-08");
    expect((await loadPage("shell", {})).user.avatarUrl).toBe("avatar:peep-08");

    for (const avatar of ["unicorn", "data:image/png;base64,AAAA", 7]) {
      expect((await call("PATCH", "/api/user", { avatar })).status).toBe(422);
    }
    expect((await call("PATCH", "/api/user", {})).status).toBe(422);
    expect((await call("POST", "/api/user/avatar")).status).toBe(404); // uploads are gone

    const renamed = await call<{ user: { name: string; avatarUrl: string | null } }>("PATCH", "/api/user", { name: "Asha" });
    expect(renamed.data.user).toMatchObject({ name: "Asha", avatarUrl: "avatar:peep-08" });
    const cleared = await call<{ user: { avatarUrl: string | null } }>("PATCH", "/api/user", { avatar: null });
    expect(cleared.data.user.avatarUrl).toBeNull();
  });

  it("backs up everything and restores it exactly", async () => {
    const shell = await loadPage("shell", {});
    const bank = shell.accounts[0];
    const cat = (key: string) => shell.categories.find((c: CategoryDTO) => c.systemKey === key)!.id;
    const today = new Date().toISOString().slice(0, 10);

    expect((await call("POST", "/api/transactions", {
      type: "income", amount: 5_000_000, description: "Salary", date: today, categoryId: cat("salary"), accountId: bank.id,
    })).status).toBe(201);
    expect((await call("POST", "/api/transactions", {
      type: "expense", amount: 240_000, description: "Dinner", date: today, categoryId: cat("food"), accountId: bank.id,
      tags: ["friends"],
    })).status).toBe(201);
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
  });

  it("restores an older backup that still lists people and shares, leaving them out", async () => {
    const backup = await (await handle("/api/export?format=json")).json();
    const old = {
      ...backup,
      contacts: [{ id: "c1", name: "Asha", color: "#64748b", avatarUrl: null, isArchived: false, createdAt: backup.exportedAt }],
      expenseShares: [{ id: "s1", transactionId: null, contactId: "c1", amount: 100, direction: "you_owe", date: backup.exportedAt }],
    };
    const res = await call("POST", "/api/backup/restore", old);
    expect(res.status).toBe(200);
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
          date: "2026-09-18", categoryId: "c1", accountId: "a1", transferAccountId: null,
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
    const { data } = await call<{ transactions: { date: string; tags: string[] }[] }>("GET", "/api/transactions");
    expect(data.transactions[0]).toMatchObject({ date: "2026-09-18", tags: ["home"] });
  });
  it("repeats a new entry from its next occurrence, without recording it twice", async () => {
    await call("POST", "/api/accounts", { name: "Repeat from", type: "bank", openingBalance: 1_000_000 });
    const { data: list } = await call<{ accounts: AccountDTO[] }>("GET", "/api/accounts");
    const account = list.accounts.find((x) => x.name === "Repeat from")!;
    const shell = await loadPage("shell", {});
    const category = shell.categories.find((c: { kind: string }) => c.kind === "expense")!;
    const today = toISODate(new Date());

    const { status, data } = await call<{ transaction: { id: string; recurringId: string | null } }>("POST", "/api/transactions", {
      type: "expense", amount: 42_000, description: "Gym membership", date: today, accountId: account.id, categoryId: category.id, repeat: "monthly",
    });
    expect(status).toBe(201);
    expect(data.transaction.recurringId).not.toBeNull();

    const { data: rules } = await call<{ recurring: RecurringDTO[] }>("GET", "/api/recurring");
    const rule = rules.recurring.find((r) => r.id === data.transaction.recurringId)!;
    expect(rule.name).toBe("Gym membership");
    expect(rule.startDate).toBe(today);
    expect(rule.nextOccurrence > today).toBe(true);

    await call("POST", "/api/recurring/run-due");
    const { data: entries } = await call<{ transactions: { description: string }[] }>("GET", `/api/transactions?accountId=${account.id}`);
    expect(entries.transactions.map((t) => t.description)).toEqual(["Gym membership"]);
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
  it("counts each category's transactions, leaving out deleted ones", async () => {
    await call("POST", "/api/accounts", { name: "Count A", type: "bank", openingBalance: 1_000_000 });
    const { data: list } = await call<{ accounts: AccountDTO[] }>("GET", "/api/accounts");
    const account = list.accounts.find((x) => x.name === "Count A")!;
    const made = await call<{ createdId: string }>("POST", "/api/categories", { name: "Count Cat", kind: "expense" });
    const unused = await call<{ createdId: string }>("POST", "/api/categories", { name: "Count Empty", kind: "expense" });
    const add = () =>
      call<{ transaction: { id: string } }>("POST", "/api/transactions", {
        type: "expense", amount: 100, description: "Count test", date: new Date().toISOString().slice(0, 10),
        categoryId: made.data.createdId, accountId: account.id,
      });
    await add();
    const second = await add();
    await add();
    await call("DELETE", `/api/transactions/${second.data.transaction.id}`);

    const page = await loadPage("categories", {});
    expect(page.transactionCounts[made.data.createdId]).toBe(2);
    expect(page.transactionCounts[unused.data.createdId]).toBeUndefined();
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

  it("reads a long history back past 500 rows, page by page", async () => {
    const shell = await loadPage("shell", {});
    const cash = shell.accounts[0].id;
    await call("PATCH", `/api/accounts/${cash}`, { openingBalance: 100_000_000 });
    for (let i = 0; i < 3; i++) {
      const rows = Array.from({ length: 250 }, (_, n) => ({
        Date: "2026-03-01", Description: `Bulk ${i}-${n}`, Amount: "-1", Type: "expense", Category: "", Account: "",
      }));
      await call("POST", "/api/import", {
        records: rows,
        mapping: { date: "Date", description: "Description", amount: "Amount", type: "Type" },
        commit: true, skipDuplicates: false, dateFormat: "YYYY-MM-DD", defaultAccountId: cash,
      });
    }
    const first = await call<{ transactions: { id: string }[]; total: number }>("GET", "/api/transactions?q=Bulk&take=500&skip=0");
    const rest = await call<{ transactions: { id: string }[] }>("GET", "/api/transactions?q=Bulk&take=500&skip=500");
    expect(first.data.total).toBe(750);
    expect(first.data.transactions).toHaveLength(500);
    expect(rest.data.transactions).toHaveLength(250);
    expect(new Set([...first.data.transactions, ...rest.data.transactions].map((t) => t.id)).size).toBe(750);
  });

  it("totals a month across every matching transaction, not just the page asked for", async () => {
    const shell = await loadPage("shell", {});
    const cat = (kind: string) => shell.categories.find((c: CategoryDTO) => c.kind === kind)!.id;
    const add = (type: string, amount: number, date: string, description: string) =>
      call("POST", "/api/transactions", { type, amount, date, description, categoryId: cat(type), accountId: shell.accounts[0].id });
    await add("income", 90_000, "2025-03-05", "Monthly pay");
    await add("expense", 10_000, "2025-03-06", "Monthly a");
    await add("expense", 20_000, "2025-03-31", "Monthly b");
    await add("expense", 5_000, "2025-04-01", "Monthly c");
    type Res = { months?: Record<string, { income: number; expense: number }> };
    const { data } = await call<Res>("GET", "/api/transactions?q=Monthly&take=1&skip=0");
    expect(data.months).toEqual({
      "2025-03": { income: 90_000, expense: 30_000 },
      "2025-04": { income: 0, expense: 5_000 },
    });
    // The filter applies, and later pages don't repeat the work.
    expect((await call<Res>("GET", "/api/transactions?q=Monthly&type=expense&take=1&skip=0")).data.months?.["2025-03"]).toEqual({ income: 0, expense: 30_000 });
    expect((await call<Res>("GET", "/api/transactions?q=Monthly&take=1&skip=1")).data.months).toBeUndefined();
  });

  it("brings back an archived account", async () => {
    const shell = await loadPage("shell", {});
    const today = new Date().toISOString().slice(0, 10);
    const salary = shell.categories.find((c: CategoryDTO) => c.kind === "income")!.id;
    const created = await call<{ accounts: AccountDTO[] }>("POST", "/api/accounts", { name: "Old wallet", type: "wallet" });
    const wallet = created.data.accounts.find((a) => a.name === "Old wallet")!;
    await call("POST", "/api/transactions", {
      type: "income", amount: 5_000, description: "Gift", date: today, categoryId: salary, accountId: wallet.id,
    });
    const archived = await call<{ archived: boolean }>("DELETE", `/api/accounts/${wallet.id}`);
    expect(archived.data.archived).toBe(true);
    const back = await call<{ accounts: AccountDTO[] }>("PATCH", `/api/accounts/${wallet.id}`, { isArchived: false });
    expect(back.data.accounts.find((a) => a.id === wallet.id)?.isArchived).toBe(false);

  });

  it("keeps a deleted category on the transactions that used it", async () => {
    const shell = await loadPage("shell", {});
    const today = new Date().toISOString().slice(0, 10);
    const made = await call<{ createdId: string }>("POST", "/api/categories", { name: "Hobby", kind: "expense" });
    await call("POST", "/api/transactions", {
      type: "expense", amount: 1_000, description: "Paint", date: today, categoryId: made.data.createdId, accountId: shell.accounts[0].id,
    });
    const del = await call<{ detached: boolean }>("DELETE", `/api/categories/${made.data.createdId}`);
    expect(del.data.detached).toBe(true);
    const list = await call<{ transactions: { description: string; categoryId: string | null }[] }>("GET", "/api/transactions?q=Paint");
    expect(list.data.transactions[0].categoryId).toBe(made.data.createdId);
  });

  it("won't let a delete or an opening-balance edit take an account below ₹0", async () => {
    const shell = await loadPage("shell", {});
    const today = toISODate(new Date());
    const salary = shell.categories.find((c: CategoryDTO) => c.kind === "income")!.id;
    const food = shell.categories.find((c: CategoryDTO) => c.kind === "expense")!.id;
    const made = await call<{ accounts: AccountDTO[] }>("POST", "/api/accounts", { name: "Guarded", type: "bank", openingBalance: 500_000 });
    const acct = made.data.accounts.find((a) => a.name === "Guarded")!;
    const tx = async (type: string, amount: number, categoryId: string) =>
      (await call<{ transaction: { id: string } }>("POST", "/api/transactions", {
        type, amount, description: `${type} ${amount}`, date: today, categoryId, accountId: acct.id,
      })).data.transaction.id;
    const income = await tx("income", 100_000, salary);
    const expense = await tx("expense", 550_000, food); // spends the opening balance and the income

    // The income paid for part of that expense: it can't be removed on its own.
    const one = await call<{ error: string }>("DELETE", `/api/transactions/${income}`);
    expect(one.status).toBe(400);
    expect(one.data.error).toMatch(/below ₹0/);
    const some = await call("POST", "/api/transactions/bulk-delete", { ids: [income] });
    expect(some.status).toBe(400);
    // Removing the expense too is fine, in one batch.
    const both = await call<{ count: number }>("POST", "/api/transactions/bulk-delete", { ids: [income, expense] });
    expect(both.status).toBe(200);
    expect(both.data.count).toBe(2);

    // Opening balance: lowering it below what the account has recorded is refused.
    await tx("expense", 300_000, food);
    const low = await call<{ fields: Record<string, string> }>("PATCH", `/api/accounts/${acct.id}`, { openingBalance: 100_000 });
    expect(low.status).toBe(400);
    expect(low.data.fields.openingBalance).toBeTruthy();
    expect((await call("PATCH", `/api/accounts/${acct.id}`, { openingBalance: 300_000 })).status).toBe(200);
  });

  it("ends a recurring rule on its last occurrence, and resuming one skips what was missed", async () => {
    const shell = await loadPage("shell", {});
    const today = toISODate(new Date());
    const salary = shell.categories.find((c: CategoryDTO) => c.kind === "income")!.id;
    const rule = {
      name: "One-off", type: "income", amount: 1_000, categoryId: salary, accountId: shell.accounts[0].id,
      frequency: "daily", interval: 1, startDate: today, endDate: today, autoPost: true, isActive: true,
    };
    await call("POST", "/api/recurring", rule);
    const run = await call<{ posted: number }>("POST", "/api/recurring/run-due");
    expect(run.data.posted).toBeGreaterThanOrEqual(1);
    const after = (await loadPage("recurring", {})).recurring.find((r) => r.name === "One-off")!;
    expect(after.isActive).toBe(false);

    // A rule paused since long ago comes back due from today, not from its old date.
    const old = toISODate(addDays(new Date(), -60));
    await call("POST", "/api/recurring", { ...rule, name: "Paused", startDate: old, endDate: null, isActive: false });
    const paused = (await loadPage("recurring", {})).recurring.find((r) => r.name === "Paused")!;
    const resumed = await call<{ recurring: { name: string; nextOccurrence: string }[] }>("PATCH", `/api/recurring/${paused.id}`, { ...rule, name: "Paused", startDate: old, endDate: null, isActive: true });
    expect(resumed.data.recurring.find((r) => r.name === "Paused")!.nextOccurrence >= today).toBe(true);
  });

  it("rejects an imported amount too big to store instead of failing the whole file", async () => {
    const shell = await loadPage("shell", {});
    const res = await call<{ summary: { invalid: number; willImport: number; invalidRows: { errors: string[] }[] } }>("POST", "/api/import", {
      records: [
        { Date: "2026-03-02", Description: "Huge", Amount: "-30000000" },
        { Date: "2026-03-02", Description: "Normal", Amount: "-12" },
      ],
      mapping: { date: "Date", description: "Description", amount: "Amount" },
      commit: true, skipDuplicates: true, dateFormat: "YYYY-MM-DD", defaultAccountId: shell.accounts[0].id,
    });
    expect(res.status).toBe(200);
    expect(res.data.summary.invalid).toBe(1);
    expect(res.data.summary.invalidRows[0].errors[0]).toMatch(/too large/);
    expect(res.data.summary.willImport).toBe(1);
  });

  it("still lets an old entry be edited after its category changes kind", async () => {
    const shell = await loadPage("shell", {});
    const today = toISODate(new Date());
    const made = await call<{ createdId: string }>("POST", "/api/categories", { name: "Flexible", kind: "expense" });
    const base = {
      type: "expense", amount: 4_000, description: "Chai", date: today, categoryId: made.data.createdId,
      accountId: shell.accounts[0].id,
    };
    const created = await call<{ transaction: { id: string } }>("POST", "/api/transactions", base);
    expect(created.status, JSON.stringify(created.data)).toBe(201);
    await call("PATCH", `/api/categories/${made.data.createdId}`, { kind: "income" });

    const edited = await call<{ transaction: { notes: string } }>(
      "PATCH", `/api/transactions/${created.data.transaction.id}`, { ...base, notes: "with ginger" },
    );
    expect(edited.status, JSON.stringify(edited.data)).toBe(200);
    expect(edited.data.transaction.notes).toBe("with ginger");

    // A new entry in that category is still held to the category's kind.
    const fresh = await call("POST", "/api/transactions", { ...base, description: "New chai" });
    expect(fresh.status).toBe(400);
  });

});
