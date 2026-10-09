/**
 * The sample data the screenshots in UI/ show, as a baaki backup file (format
 * version 2, see src/lib/backup.ts): three months of transactions up to 24
 * September 2026, a September budget, three goals, two people and five
 * recurring items. Deterministic, so every run draws the same screens.
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

export function sampleBackup() {
  const rand = prng(20260924);
  const between = (lo: number, hi: number) => Math.round(lo + rand() * (hi - lo));
  const pick = <T>(list: T[]) => list[Math.floor(rand() * list.length)];

  const cat = (key: string) => `cat-${key}`;
  const categories = DEFAULT_CATEGORIES.map((c, i) => ({
    id: cat(c.key), name: c.name, icon: c.icon, color: c.color, kind: c.kind, monthlyBudget: null,
    parentId: null, isActive: true, isSystem: true, systemKey: c.key, sortOrder: i,
    createdAt: stamp("2026-06-28"), updatedAt: stamp("2026-06-28"),
  }));

  const account = (id: string, name: string, type: string, icon: string, color: string, openingBalance: number, sortOrder: number) => ({
    id, name, type, icon, color, openingBalance, isArchived: false, sortOrder,
    createdAt: stamp("2026-06-28"), updatedAt: stamp("2026-06-28"),
  });
  const accounts = [
    account("acc-hdfc", "HDFC Bank", "bank", "bank:hdfc", "#004c8f", rupees(64_000), 0),
    account("acc-savings", "SBI Savings", "bank", "bank:sbi", "#2a6db0", rupees(1_50_000), 1),
    account("acc-cash", "Cash", "cash", "dollars", "#f59e0b", rupees(4_000), 2),
  ];

  type Tx = {
    id: string; type: string; amount: number; description: string; merchant: string | null; date: string;
    categoryId: string | null; accountId: string; transferAccountId: string | null; paymentMethod: string | null;
    notes: string | null; recurringId: string | null; createdAt: string; updatedAt: string; deletedAt: null;
  };
  const transactions: Tx[] = [];
  const add = (t: Partial<Tx> & Pick<Tx, "type" | "amount" | "description" | "date" | "accountId">) => {
    const id = `tx-${String(transactions.length + 1).padStart(3, "0")}`;
    transactions.push({
      id, merchant: null, categoryId: null, transferAccountId: null, paymentMethod: "upi", notes: null,
      recurringId: null, createdAt: stamp(t.date), updatedAt: stamp(t.date), deletedAt: null, ...t,
    });
    return id;
  };

  const MONTHS = [
    { m: "2026-07", lastDay: 31, salary: 95_000 },
    { m: "2026-08", lastDay: 31, salary: 92_000 },
    { m: "2026-09", lastDay: 24, salary: 98_500 }, // up to "today"
  ];
  const day = (m: string, d: number) => `${m}-${String(d).padStart(2, "0")}`;
  const someDay = (m: string, lastDay: number) => day(m, between(1, lastDay));

  for (const { m, lastDay, salary } of MONTHS) {
    add({ type: "income", amount: rupees(salary), description: "Salary", merchant: "Acme Technologies", date: day(m, 1),
      categoryId: cat("salary"), accountId: "acc-hdfc", paymentMethod: "net_banking", recurringId: "rec-salary" });
    add({ type: "expense", amount: rupees(22_000), description: "Rent", date: day(m, 5),
      categoryId: cat("housing"), accountId: "acc-hdfc", paymentMethod: "net_banking", recurringId: "rec-rent" });
    add({ type: "expense", amount: rupees(999), description: "Airtel Fiber", merchant: "Airtel", date: day(m, 10),
      categoryId: cat("bills-utilities"), accountId: "acc-hdfc", recurringId: "rec-internet" });
    add({ type: "expense", amount: rupees(649), description: "Netflix", merchant: "Netflix", date: day(m, 12),
      categoryId: cat("subscriptions"), accountId: "acc-hdfc", paymentMethod: "card", recurringId: "rec-netflix" });
    add({ type: "expense", amount: rupees(119), description: "Spotify", merchant: "Spotify", date: day(m, 18),
      categoryId: cat("subscriptions"), accountId: "acc-hdfc", paymentMethod: "card", recurringId: "rec-spotify" });
    add({ type: "expense", amount: rupees(between(1_600, 2_400)), description: "Electricity bill", merchant: "BESCOM",
      date: day(m, 8), categoryId: cat("bills-utilities"), accountId: "acc-hdfc" });
    add({ type: "transfer", amount: rupees(10_000), description: "To savings", date: day(m, 2),
      accountId: "acc-hdfc", transferAccountId: "acc-savings", paymentMethod: null });

    for (let i = 0; i < 4; i++) {
      add({ type: "expense", amount: rupees(between(1_400, 3_200)), description: "Groceries",
        merchant: pick(["BigBasket", "Zepto", "DMart", "Blinkit"]), date: someDay(m, lastDay),
        categoryId: cat("groceries"), accountId: "acc-hdfc" });
    }
    for (let i = 0; i < 9; i++) {
      const [merchant, description] = pick([["Swiggy", "Dinner"], ["Zomato", "Lunch"], ["Third Wave Coffee", "Coffee"], ["Meghana Foods", "Biryani"]]);
      add({ type: "expense", amount: rupees(between(180, 900)), description, merchant, date: someDay(m, lastDay),
        categoryId: cat("food"), accountId: pick(["acc-hdfc", "acc-hdfc", "acc-cash"]),
        paymentMethod: pick(["upi", "upi", "cash"]) });
    }
    for (let i = 0; i < 7; i++) {
      const [merchant, description, lo, hi] = pick([["Uber", "Cab", 150, 520], ["Namma Metro", "Metro", 40, 90], ["Indian Oil", "Fuel", 1_500, 2_600]] as const);
      add({ type: "expense", amount: rupees(between(lo, hi)), description, merchant, date: someDay(m, lastDay),
        categoryId: cat("transportation"), accountId: "acc-hdfc" });
    }
    for (let i = 0; i < 2; i++) {
      add({ type: "expense", amount: rupees(between(900, 4_200)), description: pick(["Shoes", "Shirt", "Headphones", "Books"]),
        merchant: pick(["Amazon", "Myntra", "Flipkart"]), date: someDay(m, lastDay), categoryId: cat("shopping"),
        accountId: "acc-hdfc", paymentMethod: "card" });
    }
    add({ type: "expense", amount: rupees(between(450, 900)), description: "Movie", merchant: "PVR",
      date: someDay(m, lastDay), categoryId: cat("entertainment"), accountId: "acc-hdfc" });
  }
  add({ type: "expense", amount: rupees(850), description: "Pharmacy", merchant: "Apollo Pharmacy", date: "2026-08-14",
    categoryId: cat("healthcare"), accountId: "acc-hdfc" });
  add({ type: "expense", amount: rupees(6_400), description: "Flights to Goa", merchant: "IndiGo", date: "2026-09-03",
    categoryId: cat("travel"), accountId: "acc-hdfc", paymentMethod: "card" });
  add({ type: "income", amount: rupees(4_500), description: "Freelance design", date: "2026-09-16",
    categoryId: cat("business"), accountId: "acc-hdfc", paymentMethod: "net_banking" });
  const dinner = add({ type: "expense", amount: rupees(2_400), description: "Team dinner", merchant: "Toit",
    date: "2026-09-20", categoryId: cat("food"), accountId: "acc-hdfc", paymentMethod: "card" });
  const cab = add({ type: "expense", amount: rupees(1_100), description: "Airport cab", merchant: "Uber",
    date: "2026-08-22", categoryId: cat("transportation"), accountId: "acc-hdfc" });

  const recurring = [
    { id: "rec-salary", name: "Salary", type: "income", amount: rupees(98_500), categoryId: cat("salary"), day: 1, method: "net_banking" },
    { id: "rec-rent", name: "Rent", type: "expense", amount: rupees(22_000), categoryId: cat("housing"), day: 5, method: "net_banking" },
    { id: "rec-internet", name: "Airtel Fiber", type: "expense", amount: rupees(999), categoryId: cat("bills-utilities"), day: 10, method: "upi" },
    { id: "rec-netflix", name: "Netflix", type: "expense", amount: rupees(649), categoryId: cat("subscriptions"), day: 12, method: "card" },
    { id: "rec-spotify", name: "Spotify", type: "expense", amount: rupees(119), categoryId: cat("subscriptions"), day: 18, method: "card" },
  ].map((r) => ({
    id: r.id, name: r.name, type: r.type, amount: r.amount, categoryId: r.categoryId, accountId: "acc-hdfc",
    transferAccountId: null, paymentMethod: r.method, notes: null, frequency: "monthly", interval: 1,
    startDate: day("2026-07", r.day), endDate: null, nextOccurrence: day("2026-10", r.day),
    lastPostedDate: day("2026-09", r.day), isActive: true, autoPost: false,
    createdAt: stamp("2026-06-28"), updatedAt: stamp("2026-09-01"),
  }));

  const budgets = [{ id: "budget-2026-09", year: 2026, month: 9, overallLimit: rupees(60_000),
    createdAt: stamp("2026-09-01"), updatedAt: stamp("2026-09-01") }];
  const budgetCategories = ([
    ["food", 6_000], ["groceries", 10_000], ["transportation", 6_000], ["shopping", 5_000],
    ["entertainment", 2_000], ["bills-utilities", 4_000], ["subscriptions", 1_000],
  ] as const).map(([key, limit]) => ({ id: `bc-${key}`, budgetId: "budget-2026-09", categoryId: cat(key), limit: rupees(limit) }));

  const goals = [
    { id: "goal-emergency", name: "Emergency fund", icon: "money-sack", color: "#2c6b4f", target: 3_00_000, date: "2027-06-30" },
    { id: "goal-goa", name: "Goa trip", icon: "airplane", color: "#3f7d6e", target: 40_000, date: "2026-12-15" },
    { id: "goal-laptop", name: "New laptop", icon: "graduation", color: "#4a6785", target: 90_000, date: "2027-03-31" },
  ].map((g) => ({
    id: g.id, name: g.name, icon: g.icon, color: g.color, targetAmount: rupees(g.target), targetDate: g.date,
    accountId: "acc-savings", status: "active", createdAt: stamp("2026-07-01"), updatedAt: stamp("2026-09-02"),
  }));
  const goalContributions = ([
    ["goal-emergency", 60_000, "2026-07-02"], ["goal-emergency", 40_000, "2026-08-02"], ["goal-emergency", 20_000, "2026-09-02"],
    ["goal-goa", 10_000, "2026-08-02"], ["goal-goa", 8_000, "2026-09-02"],
    ["goal-laptop", 25_000, "2026-07-02"], ["goal-laptop", 10_000, "2026-09-02"],
  ] as const).map(([goalId, amount, date], i) => ({
    id: `gc-${i + 1}`, goalId, amount: rupees(amount), date, note: null, createdAt: stamp(date),
  }));

  const contacts = [
    { id: "person-arjun", name: "Arjun", color: "#6366f1", avatarUrl: null, isArchived: false, createdAt: stamp("2026-07-01") },
    { id: "person-priya", name: "Priya", color: "#ec4899", avatarUrl: null, isArchived: false, createdAt: stamp("2026-07-01") },
  ];
  const expenseShares = [
    { id: "share-1", transactionId: dinner, contactId: "person-arjun", amount: rupees(800), direction: "owed_to_you",
      description: null, date: "2026-09-20", settled: false, settledAt: null, createdAt: stamp("2026-09-20") },
    { id: "share-2", transactionId: dinner, contactId: "person-priya", amount: rupees(800), direction: "owed_to_you",
      description: null, date: "2026-09-20", settled: false, settledAt: null, createdAt: stamp("2026-09-20") },
    { id: "share-3", transactionId: null, contactId: "person-priya", amount: rupees(650), direction: "you_owe",
      description: "Concert tickets", date: "2026-09-12", settled: false, settledAt: null, createdAt: stamp("2026-09-12") },
    { id: "share-4", transactionId: cab, contactId: "person-arjun", amount: rupees(550), direction: "owed_to_you",
      description: null, date: "2026-08-22", settled: true, settledAt: stamp("2026-08-30"), createdAt: stamp("2026-08-22") },
  ];

  return {
    app: "baaki",
    version: 2,
    exportedAt: TODAY,
    user: { name: PROFILE_NAME, avatarUrl: null },
    preference: {
      currency: "INR", locale: "en-IN", monthStartDay: 1, dashboardWidgets: JSON.stringify(DEFAULT_DASHBOARD_WIDGETS),
      defaultAccountId: "acc-hdfc", appLock: false,
    },
    accounts, categories, tags: [], recurring, transactions, transactionTags: [],
    budgets, budgetCategories, budgetAccounts: [], goals, goalContributions, contacts, expenseShares,
  };
}
