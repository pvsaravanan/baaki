import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", async () => (await import("@/test/memory-db")).memoryDb());

import { handle, loadPage } from "@/server/local-server";
import { sampleBackup } from "../../scripts/sample-data";

/**
 * Adding a transaction must move every number the screens show by exactly the
 * right amount. Each step here goes through the app's real API, then checks
 * balances, the month's income, expenses and savings, category totals, budget
 * status and the change since last month against a plain recomputation from
 * the raw rows below. None of it uses the app's own calculation code, so a
 * mistake there can't hide behind itself.
 */

type Kind = "income" | "expense" | "transfer";
interface Row {
  id: string;
  type: Kind;
  amount: number; // paise
  shared: number; // other people's parts of a split expense (paise)
  accountId: string;
  transferAccountId: string | null;
  categoryId: string | null;
  date: string; // YYYY-MM-DD
}

const MONTH = "2026-09";
const PREVIOUS = "2026-08";
const rupees = (r: number) => Math.round(r * 100);

async function call<T = Record<string, unknown>>(method: string, url: string, body?: unknown) {
  const res = await handle(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, data: (await res.json()) as T };
}

// ---- the oracle ----

const backup = sampleBackup();
const openings = new Map(backup.accounts.map((a) => [a.id, a.openingBalance]));
const ledger: Row[] = backup.transactions.map((t) => ({
  id: t.id,
  type: t.type as Kind,
  amount: t.amount,
  shared: 0,
  accountId: t.accountId,
  transferAccountId: t.transferAccountId,
  categoryId: t.categoryId,
  date: t.date,
}));
// Split shares paid back, by the account they came back into.
const paidBack = new Map<string, number>();

const own = (t: Row) => (t.type === "expense" ? Math.max(0, t.amount - t.shared) : t.amount);
const inMonth = (t: Row, m: string) => t.date.startsWith(m);

function expectedBalance(accountId: string) {
  let b = openings.get(accountId) ?? 0;
  for (const t of ledger) {
    if (t.accountId === accountId) b += t.type === "income" ? t.amount : -t.amount; // expense and transfer-out leave
    if (t.type === "transfer" && t.transferAccountId === accountId) b += t.amount;
  }
  return b + (paidBack.get(accountId) ?? 0);
}

function expectedMonth(m: string) {
  const rows = ledger.filter((t) => inMonth(t, m));
  const income = rows.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = rows.filter((t) => t.type === "expense").reduce((s, t) => s + own(t), 0);
  const byCategory = new Map<string, number>();
  for (const t of rows) if (t.type === "expense") byCategory.set(t.categoryId ?? "", (byCategory.get(t.categoryId ?? "") ?? 0) + own(t));
  return {
    income,
    expense,
    net: income - expense,
    rate: income > 0 ? ((income - expense) / income) * 100 : 0,
    count: rows.length,
    byCategory,
  };
}

/** Percentage change, null where it isn't meaningful (from zero, or across a sign). */
function pct(cur: number, prev: number) {
  if (prev === 0) return cur === 0 ? 0 : null;
  if (cur !== 0 && Math.sign(cur) !== Math.sign(prev)) return null;
  return ((cur - prev) / Math.abs(prev)) * 100;
}

const limits = new Map(backup.budgetCategories.map((b) => [b.categoryId, b.limit]));
const overallLimit = backup.budgets[0].overallLimit;
const stateOf = (spent: number, limit: number) => (spent >= limit ? "over" : spent / limit >= 0.9 ? "warning" : "under");

/** Everything the screens derive, compared with the oracle. */
async function verify(step: string) {
  const shell = await loadPage("shell", {});
  for (const a of shell.accounts) expect(a.balance, `${step}: balance of ${a.name}`).toBe(expectedBalance(a.id));
  const accounts = await loadPage("accounts", {});
  for (const a of accounts.accounts) expect(a.balance, `${step}: accounts screen, ${a.name}`).toBe(expectedBalance(a.id));

  const { analytics: a } = await loadPage("dashboard", { m: MONTH });
  const cur = expectedMonth(MONTH);
  const prev = expectedMonth(PREVIOUS);
  const ids = [...openings.keys()];
  expect(a.totalBalance, `${step}: total balance`).toBe(ids.reduce((s, id) => s + expectedBalance(id), 0));
  expect(a.current.income, `${step}: income`).toBe(cur.income);
  expect(a.current.effectiveExpense, `${step}: expenses`).toBe(cur.expense);
  expect(a.current.net, `${step}: savings`).toBe(cur.net);
  expect(a.current.savingsRate, `${step}: savings rate`).toBeCloseTo(cur.rate, 9);
  expect(a.transactionCount, `${step}: count`).toBe(cur.count);
  expect(a.previous.income, `${step}: last month's income`).toBe(prev.income);
  expect(a.previous.effectiveExpense, `${step}: last month's expenses`).toBe(prev.expense);

  const same = (x: number | null, y: number | null, what: string) =>
    y === null ? expect(x, `${step}: ${what}`).toBeNull() : expect(x, `${step}: ${what}`).toBeCloseTo(y, 9);
  same(a.deltas.income, pct(cur.income, prev.income), "income change");
  same(a.deltas.expense, pct(cur.expense, prev.expense), "expense change");
  same(a.deltas.net, pct(cur.net, prev.net), "savings change");
  same(a.deltas.savings, cur.income > 0 || prev.income > 0 ? cur.rate - prev.rate : null, "savings rate change");

  // Category totals: every category with spending, nothing else, and they add up to the expenses.
  const shown = new Map(a.categories.map((c) => [c.categoryId ?? "", c.expense]));
  expect(shown, `${step}: category totals`).toEqual(new Map([...cur.byCategory].filter(([, v]) => v > 0)));
  expect([...shown.values()].reduce((s, v) => s + v, 0), `${step}: categories add up to expenses`).toBe(cur.expense);

  // Budget: each line and the overall.
  for (const line of a.budget.lines) {
    const spent = cur.byCategory.get(line.categoryId) ?? 0;
    expect(line.spent, `${step}: budget spent, ${line.name}`).toBe(spent);
    expect(line.status.remaining, `${step}: budget left, ${line.name}`).toBe(limits.get(line.categoryId)! - spent);
    expect(line.status.state, `${step}: budget state, ${line.name}`).toBe(stateOf(spent, limits.get(line.categoryId)!));
  }
  expect(a.budget.overallSpent, `${step}: overall budget spent`).toBe(cur.expense);
  expect(a.budget.status?.remaining, `${step}: overall budget left`).toBe(overallLimit - cur.expense);
  expect(a.budget.status?.state, `${step}: overall budget state`).toBe(stateOf(cur.expense, overallLimit));

  // The trend chart's last two bars are these two months.
  const trend = a.incomeExpenseTrend;
  expect(trend.at(-1), `${step}: trend, this month`).toMatchObject({ income: cur.income, expense: cur.expense });
  expect(trend.at(-2), `${step}: trend, last month`).toMatchObject({ income: prev.income, expense: prev.expense });

  // The month's expenses are the sum of its days.
  expect(a.daily.reduce((s, d) => s + d.expense, 0), `${step}: daily series, expenses`).toBe(cur.expense);
  expect(a.daily.reduce((s, d) => s + d.income, 0), `${step}: daily series, income`).toBe(cur.income);
}

interface NewTx {
  type: Kind;
  amount: number;
  description?: string;
  date?: string;
  account?: string;
  to?: string;
  category?: string;
  splits?: { name: string; amount: number }[];
}

/** Add through the API; record it in the ledger only if the app accepted it. */
async function add(t: NewTx) {
  const res = await call<{ transaction?: { id: string; splits: { id: string; amount: number }[] }; message?: string; fields?: Record<string, string> }>(
    "POST",
    "/api/transactions",
    {
      type: t.type,
      amount: t.amount,
      description: t.description ?? "Test",
      date: t.date ?? "2026-09-25",
      accountId: t.account ?? "acc-hdfc",
      transferAccountId: t.type === "transfer" ? t.to : undefined,
      categoryId: t.type === "transfer" ? undefined : `cat-${t.category ?? (t.type === "income" ? "salary" : "food")}`,
      splits: t.splits,
    },
  );
  if (res.status === 201) {
    ledger.push({
      id: res.data.transaction!.id,
      type: t.type,
      amount: t.amount,
      shared: (t.splits ?? []).reduce((s, x) => s + x.amount, 0),
      accountId: t.account ?? "acc-hdfc",
      transferAccountId: t.type === "transfer" ? t.to ?? null : null,
      categoryId: t.type === "transfer" ? null : `cat-${t.category ?? (t.type === "income" ? "salary" : "food")}`,
      date: t.date ?? "2026-09-25",
    });
  }
  return res;
}

beforeAll(async () => {
  const res = await call("POST", "/api/backup/restore", backup);
  expect(res.status).toBe(200);
});

describe("adding a transaction", () => {
  it("starts from numbers that already agree", async () => {
    await verify("the demo data");
  });

  it("an expense lowers one account, the month's expenses and its category by exactly its amount", async () => {
    const before = expectedBalance("acc-hdfc");
    expect((await add({ type: "expense", amount: rupees(1234.56), category: "food" })).status).toBe(201);
    expect(expectedBalance("acc-hdfc")).toBe(before - rupees(1234.56));
    await verify("expense of ₹1,234.56");
  });

  it("keeps single paise and odd decimals exact", async () => {
    for (const paise of [1, 10, 99, 101, 100_001, 99_999]) {
      expect((await add({ type: "expense", amount: paise, category: "groceries", description: `${paise}p` })).status).toBe(201);
    }
    await verify("paise amounts");
  });

  it("income raises one account and the month's income and savings", async () => {
    expect((await add({ type: "income", amount: rupees(5000.5), category: "business", account: "acc-savings" })).status).toBe(201);
    await verify("income of ₹5,000.50");
  });

  it("a transfer moves money between accounts without touching income, expenses or the total", async () => {
    const total = ["acc-hdfc", "acc-savings", "acc-cash"].reduce((s, id) => s + expectedBalance(id), 0);
    const before = (await loadPage("dashboard", { m: MONTH })).analytics.current;
    expect((await add({ type: "transfer", amount: rupees(10_000), account: "acc-hdfc", to: "acc-savings" })).status).toBe(201);
    expect(["acc-hdfc", "acc-savings", "acc-cash"].reduce((s, id) => s + expectedBalance(id), 0)).toBe(total);
    const after = (await loadPage("dashboard", { m: MONTH })).analytics.current;
    expect(after.income).toBe(before.income);
    expect(after.effectiveExpense).toBe(before.effectiveExpense);
    await verify("transfer of ₹10,000");
  });

  it("a split expense takes the whole bill from the account but counts only your share as spending", async () => {
    const hdfc = expectedBalance("acc-hdfc");
    const res = await add({
      type: "expense",
      amount: rupees(1000),
      category: "entertainment",
      description: "Dinner out",
      splits: [
        { name: "Asha", amount: rupees(250) },
        { name: "Ravi", amount: rupees(250) },
      ],
    });
    expect(res.status).toBe(201);
    expect(expectedBalance("acc-hdfc")).toBe(hdfc - rupees(1000)); // the whole bill left the account
    await verify("split expense of ₹1,000 (₹500 yours)");
  });

  it("a share paid back raises that account's balance, and is not income", async () => {
    const dinner = ledger.at(-1)!;
    const tx = (await call<{ transactions: { id: string; splits: { id: string }[] }[] }>("GET", "/api/transactions")).data.transactions.find((t) => t.id === dinner.id)!;
    const income = (await loadPage("dashboard", { m: MONTH })).analytics.current.income;
    const res = await call("POST", "/api/splits/settle", { ids: [tx.splits[0].id], accountId: "acc-cash" });
    expect(res.status).toBe(200);
    paidBack.set("acc-cash", (paidBack.get("acc-cash") ?? 0) + rupees(250));
    expect((await loadPage("dashboard", { m: MONTH })).analytics.current.income).toBe(income);
    await verify("a ₹250 share paid back into Cash");
  });

  it("an expense dated last month changes last month's numbers and the change since, not this month's", async () => {
    expect((await add({ type: "expense", amount: rupees(777), date: "2026-08-30", category: "shopping" })).status).toBe(201);
    expect((await add({ type: "income", amount: rupees(1500), date: "2026-08-12", category: "business" })).status).toBe(201);
    await verify("entries dated in August");
  });

  it("month ends fall in the right month", async () => {
    for (const [date, label] of [["2026-09-30", "last day of September"], ["2026-10-01", "first day of October"], ["2026-09-01", "first day of September"], ["2026-08-31", "last day of August"]] as const) {
      expect((await add({ type: "expense", amount: rupees(111), date, category: "food", description: label })).status).toBe(201);
    }
    await verify("month-end dates");
  });

  it("pushes a budget through warning to over at the right rupee", async () => {
    const dash = async () => (await loadPage("dashboard", { m: MONTH })).analytics.budget.lines.find((l) => l.categoryId === "cat-subscriptions")!;
    const limit = limits.get("cat-subscriptions")!; // ₹1,000
    const spent = (await dash()).spent;
    // Up to one paisa short of 90%: still under.
    await add({ type: "expense", amount: Math.floor(limit * 0.9) - 1 - spent, category: "subscriptions" });
    expect((await dash()).status.state).toBe("under");
    await verify("one paisa under 90% of a budget");
    await add({ type: "expense", amount: 1, category: "subscriptions" });
    expect((await dash()).status.state).toBe("warning");
    await verify("exactly 90% of a budget");
    await add({ type: "expense", amount: limit - Math.floor(limit * 0.9) - 1, category: "subscriptions" });
    expect((await dash()).status.state).toBe("warning");
    await verify("one paisa under a budget");
    await add({ type: "expense", amount: 1, category: "subscriptions" });
    expect((await dash()).status.state).toBe("over");
    await verify("exactly at a budget");
  });

  it("refuses what an account can't cover, to the paisa, and changes nothing", async () => {
    const cash = expectedBalance("acc-cash");
    expect(cash).toBeGreaterThan(0);
    const over = await add({ type: "expense", amount: cash + 1, account: "acc-cash", category: "food" });
    expect(over.status).toBe(400);
    await verify("a refused expense");
    expect((await add({ type: "expense", amount: cash, account: "acc-cash", category: "food" })).status).toBe(201);
    expect(expectedBalance("acc-cash")).toBe(0);
    await verify("spending an account to exactly ₹0");
    expect((await add({ type: "expense", amount: 1, account: "acc-cash", category: "food" })).status).toBe(400);
    expect((await add({ type: "transfer", amount: 1, account: "acc-cash", to: "acc-hdfc" })).status).toBe(400);
    await verify("refused from an empty account");
  });

  it("rejects bad amounts and shapes without recording anything", async () => {
    for (const amount of [0, -100, 1.5, 3_000_000_000]) {
      expect((await add({ type: "expense", amount })).status, `amount ${amount}`).toBe(422);
    }
    expect((await add({ type: "transfer", amount: 100, account: "acc-hdfc", to: "acc-hdfc" })).status).toBe(422);
    expect((await add({ type: "expense", amount: 1000, splits: [{ name: "A", amount: 2000 }] })).status).toBe(422);
    expect((await add({ type: "expense", amount: 1000, date: "2026-02-30" })).status).toBe(422);
    await verify("rejected entries");
  });

  it("editing and deleting a transaction moves every number back correctly", async () => {
    const made = (await add({ type: "expense", amount: rupees(4000), category: "shopping", description: "Edit me" })).data.transaction!.id;
    const row = ledger.find((t) => t.id === made)!;
    await verify("before the edit");

    // Edit: a smaller amount, another category, another account.
    const edited = await call("PATCH", `/api/transactions/${made}`, {
      type: "expense", amount: rupees(2500.25), description: "Edit me", date: "2026-09-25",
      accountId: "acc-savings", categoryId: "cat-travel",
    });
    expect(edited.status).toBe(200);
    Object.assign(row, { amount: rupees(2500.25), accountId: "acc-savings", categoryId: "cat-travel" });
    await verify("after editing amount, account and category");

    // Delete, then restore.
    expect((await call("DELETE", `/api/transactions/${made}`)).status).toBe(200);
    ledger.splice(ledger.indexOf(row), 1);
    await verify("after deleting");
    expect((await call("POST", `/api/transactions/${made}/restore`)).status).toBe(200);
    ledger.push(row);
    await verify("after restoring");
  });

  it("repeating a new entry adds it once, not twice", async () => {
    const res = await call<{ transaction: { id: string } }>("POST", "/api/transactions", {
      type: "expense", amount: rupees(299), description: "Gym", date: "2026-09-26", accountId: "acc-hdfc",
      categoryId: "cat-personal", repeat: "monthly",
    });
    expect(res.status).toBe(201);
    ledger.push({ id: res.data.transaction.id, type: "expense", amount: rupees(299), shared: 0, accountId: "acc-hdfc", transferAccountId: null, categoryId: "cat-personal", date: "2026-09-26" });
    await verify("a repeating entry");
  });
});
