/**
 * The sample data the screenshots in UI/ show, as a baaki backup file (format
 * version 2, see src/lib/backup.ts): three months of transactions up to 24
 * September 2026, a September budget and five
 * recurring items. Deterministic, so every run draws the same screens.
 *
 * Pass another `today` to get the same shape of data ending on that day (the
 * last three months, up to it), for demo data in an install made today; see
 * scripts/seed-demo.ts. The default is what the screenshots use.
 *
 * Categories and the dashboard layout come from the app itself, so they stay
 * in step with it. Restore checks every field: a change to the backup format
 * makes the capture fail loudly rather than draw the wrong data.
 */
import { DEFAULT_CATEGORIES } from "../src/lib/constants";
import { DEFAULT_DASHBOARD_WIDGETS } from "../src/lib/dashboard-widgets";

/** The capture's "now": a Thursday afternoon in the last month of data. */
export const TODAY = "2026-09-24T14:30:00+05:30";
export const PROFILE_NAME = "Saravanan";

const rupees = (r: number) => Math.round(r * 100);
const stamp = (day: string) => `${day}T09:00:00.000Z`;

/** Small seeded PRNG, so the "random" amounts and days never change. */
function prng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function sampleBackup(today: string = TODAY) {
  const rand = prng(20260924);
  const between = (lo: number, hi: number) => Math.round(lo + rand() * (hi - lo));
  const pick = <T>(list: T[]) => list[Math.floor(rand() * list.length)];

  // The three months ending with `today`'s, and the days they have.
  const [todayYear, todayMonth, todayDay] = today.slice(0, 10).split("-").map(Number);
  const monthOf = (offset: number) => {
    const d = new Date(Date.UTC(todayYear, todayMonth - 1 + offset, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  };
  const daysIn = (m: string) => new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0)).getUTCDate();
  const [m0, m1, m2, mNext, mBefore] = [-2, -1, 0, 1, -3].map(monthOf);
  const MONTHS = [
    { m: m0, lastDay: daysIn(m0), salary: 95_000 },
    { m: m1, lastDay: daysIn(m1), salary: 92_000 },
    { m: m2, lastDay: todayDay, salary: 98_500 }, // up to "today"
  ];
  const day = (m: string, d: number) => `${m}-${String(d).padStart(2, "0")}`;
  const created = stamp(day(mBefore, 28));

  const cat = (key: string) => `cat-${key}`;
  const categories = DEFAULT_CATEGORIES.map((c, i) => ({
    id: cat(c.key), name: c.name, icon: c.icon, color: c.color, kind: c.kind, monthlyBudget: null,
    parentId: null, isActive: true, isSystem: true, systemKey: c.key, sortOrder: i,
    createdAt: created, updatedAt: created,
  }));

  const account = (id: string, name: string, type: string, icon: string, color: string, openingBalance: number, sortOrder: number) => ({
    id, name, type, icon, color, openingBalance, isArchived: false, sortOrder,
    createdAt: created, updatedAt: created,
  });
  const accounts = [
    account("acc-hdfc", "HDFC Bank", "bank", "bank:hdfc", "#004c8f", rupees(64_000), 0),
    account("acc-savings", "SBI Savings", "bank", "bank:sbi", "#2a6db0", rupees(1_50_000), 1),
    account("acc-cash", "Cash", "cash", "dollars", "#f59e0b", rupees(6_000), 2),
  ];

  type Tx = {
    id: string; type: string; amount: number; description: string; merchant: string | null; date: string;
    categoryId: string | null; accountId: string; transferAccountId: string | null;
    notes: string | null; recurringId: string | null; createdAt: string; updatedAt: string; deletedAt: null;
  };
  const transactions: Tx[] = [];
  const add = (t: Partial<Tx> & Pick<Tx, "type" | "amount" | "description" | "date" | "accountId">) => {
    const id = `tx-${String(transactions.length + 1).padStart(3, "0")}`;
    transactions.push({
      id, merchant: null, categoryId: null, transferAccountId: null, notes: null,
      recurringId: null, createdAt: stamp(t.date), updatedAt: stamp(t.date), deletedAt: null, ...t,
    });
    return id;
  };

  const someDay = (m: string, lastDay: number) => day(m, between(1, lastDay));

  for (const { m, lastDay, salary } of MONTHS) {
    // A bill whose day hasn't come yet in the last month isn't there (never so for the screenshots' data).
    const due = (d: number) => d <= lastDay;
    if (due(1)) add({ type: "income", amount: rupees(salary), description: "Salary", merchant: "Acme Technologies", date: day(m, 1),
      categoryId: cat("salary"), accountId: "acc-hdfc", recurringId: "rec-salary" });
    if (due(5)) add({ type: "expense", amount: rupees(22_000), description: "Rent", date: day(m, 5),
      categoryId: cat("housing"), accountId: "acc-hdfc", recurringId: "rec-rent" });
    if (due(10)) add({ type: "expense", amount: rupees(999), description: "Airtel Fiber", merchant: "Airtel", date: day(m, 10),
      categoryId: cat("bills-utilities"), accountId: "acc-hdfc", recurringId: "rec-internet" });
    if (due(12)) add({ type: "expense", amount: rupees(649), description: "Netflix", merchant: "Netflix", date: day(m, 12),
      categoryId: cat("subscriptions"), accountId: "acc-hdfc", recurringId: "rec-netflix" });
    if (due(18)) add({ type: "expense", amount: rupees(119), description: "Spotify", merchant: "Spotify", date: day(m, 18),
      categoryId: cat("subscriptions"), accountId: "acc-hdfc", recurringId: "rec-spotify" });
    if (due(8)) add({ type: "expense", amount: rupees(between(1_600, 2_400)), description: "Electricity bill", merchant: "BESCOM",
      date: day(m, 8), categoryId: cat("bills-utilities"), accountId: "acc-hdfc" });
    if (due(2)) add({ type: "transfer", amount: rupees(10_000), description: "To savings", date: day(m, 2),
      accountId: "acc-hdfc", transferAccountId: "acc-savings" });

    for (let i = 0; i < 4; i++) {
      add({ type: "expense", amount: rupees(between(1_400, 3_200)), description: "Groceries",
        merchant: pick(["BigBasket", "Zepto", "DMart", "Blinkit"]), date: someDay(m, lastDay),
        categoryId: cat("groceries"), accountId: "acc-hdfc" });
    }
    for (let i = 0; i < 9; i++) {
      const [merchant, description] = pick([["Swiggy", "Dinner"], ["Zomato", "Lunch"], ["Third Wave Coffee", "Coffee"], ["Meghana Foods", "Biryani"]]);
      add({ type: "expense", amount: rupees(between(180, 900)), description, merchant, date: someDay(m, lastDay),
        categoryId: cat("food"), accountId: pick(["acc-hdfc", "acc-hdfc", "acc-cash"]) });
    }
    for (let i = 0; i < 7; i++) {
      const [merchant, description, lo, hi] = pick([["Uber", "Cab", 150, 520], ["Namma Metro", "Metro", 40, 90], ["Indian Oil", "Fuel", 1_500, 2_600]] as const);
      add({ type: "expense", amount: rupees(between(lo, hi)), description, merchant, date: someDay(m, lastDay),
        categoryId: cat("transportation"), accountId: "acc-hdfc" });
    }
    for (let i = 0; i < 2; i++) {
      add({ type: "expense", amount: rupees(between(900, 4_200)), description: pick(["Shoes", "Shirt", "Headphones", "Books"]),
        merchant: pick(["Amazon", "Myntra", "Flipkart"]), date: someDay(m, lastDay), categoryId: cat("shopping"),
        accountId: "acc-hdfc" });
    }
    add({ type: "expense", amount: rupees(between(450, 900)), description: "Movie", merchant: "PVR",
      date: someDay(m, lastDay), categoryId: cat("entertainment"), accountId: "acc-hdfc" });
  }
  add({ type: "expense", amount: rupees(850), description: "Pharmacy", merchant: "Apollo Pharmacy", date: day(m1, 14),
    categoryId: cat("healthcare"), accountId: "acc-hdfc" });
  add({ type: "expense", amount: rupees(6_400), description: "Flights to Goa", merchant: "IndiGo", date: day(m2, Math.min(3, todayDay)),
    categoryId: cat("travel"), accountId: "acc-hdfc" });
  add({ type: "income", amount: rupees(4_500), description: "Freelance design", date: day(m2, Math.min(16, todayDay)),
    categoryId: cat("business"), accountId: "acc-hdfc" });
  add({ type: "expense", amount: rupees(2_400), description: "Team dinner", merchant: "Toit",
    date: day(m2, Math.min(20, todayDay)), categoryId: cat("food"), accountId: "acc-hdfc" });
  add({ type: "expense", amount: rupees(1_100), description: "Airport cab", merchant: "Uber",
    date: day(m1, 22), categoryId: cat("transportation"), accountId: "acc-hdfc" });

  const recurring = [
    { id: "rec-salary", name: "Salary", type: "income", amount: rupees(98_500), categoryId: cat("salary"), day: 1 },
    { id: "rec-rent", name: "Rent", type: "expense", amount: rupees(22_000), categoryId: cat("housing"), day: 5 },
    { id: "rec-internet", name: "Airtel Fiber", type: "expense", amount: rupees(999), categoryId: cat("bills-utilities"), day: 10 },
    { id: "rec-netflix", name: "Netflix", type: "expense", amount: rupees(649), categoryId: cat("subscriptions"), day: 12 },
    { id: "rec-spotify", name: "Spotify", type: "expense", amount: rupees(119), categoryId: cat("subscriptions"), day: 18 },
  ].map((r) => ({
    id: r.id, name: r.name, type: r.type, amount: r.amount, categoryId: r.categoryId, accountId: "acc-hdfc",
    transferAccountId: null, notes: null, frequency: "monthly", interval: 1,
    startDate: day(m0, r.day), endDate: null,
    // Posted this month once its day has come; until then last month's was the latest.
    nextOccurrence: r.day <= todayDay ? day(mNext, r.day) : day(m2, r.day),
    lastPostedDate: r.day <= todayDay ? day(m2, r.day) : day(m1, r.day), isActive: true, autoPost: false,
    createdAt: created, updatedAt: stamp(day(m2, 1)),
  }));

  const budgetId = `budget-${m2}`;
  const budgets = [{ id: budgetId, year: Number(m2.slice(0, 4)), month: Number(m2.slice(5, 7)), overallLimit: rupees(60_000),
    createdAt: stamp(day(m2, 1)), updatedAt: stamp(day(m2, 1)) }];
  const budgetCategories = ([
    ["food", 6_000], ["groceries", 10_000], ["transportation", 6_000], ["shopping", 5_000],
    ["entertainment", 2_000], ["bills-utilities", 4_000], ["subscriptions", 1_000],
  ] as const).map(([key, limit]) => ({ id: `bc-${key}`, budgetId, categoryId: cat(key), limit: rupees(limit) }));

  return {
    app: "baaki",
    version: 2,
    exportedAt: today,
    user: { name: PROFILE_NAME, avatarUrl: null },
    preference: {
      currency: "INR", locale: "en-IN", monthStartDay: 1, dashboardWidgets: JSON.stringify(DEFAULT_DASHBOARD_WIDGETS),
      defaultAccountId: "acc-hdfc", appLock: false,
    },
    accounts, categories, tags: [], recurring, transactions, transactionTags: [],
    budgets, budgetCategories, budgetAccounts: [],
  };
}
