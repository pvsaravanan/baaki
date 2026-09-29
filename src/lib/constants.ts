/**
 * Domain constants and the string-union "enum" types used across the app.
 * These mirror the String columns in prisma/schema.prisma.
 */

import type { CategoryIconKey } from "./category-icons";

export const TRANSACTION_TYPES = ["expense", "income", "transfer"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const PAYMENT_METHODS = ["upi", "cash", "card", "net_banking", "other"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  upi: "UPI",
  cash: "Cash",
  card: "Card (Debit/Credit)",
  net_banking: "Net Banking",
  other: "Other",
};

export const ACCOUNT_TYPES = [
  "bank",
  "cash",
  "credit_card",
  "savings",
  "wallet",
  "investment",
  "loan",
  "other",
] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

/**
 * Account types whose balance normally goes below ₹0 — it's what you owe —
 * so they're exempt from the "can't spend more than the balance" rule.
 */
export const BALANCE_EXEMPT_ACCOUNT_TYPES: readonly string[] = ["credit_card", "loan"];

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  bank: "Bank Account",
  cash: "Cash",
  credit_card: "Credit Card",
  savings: "Savings",
  wallet: "Digital Wallet",
  investment: "Investment",
  loan: "Loan / EMI",
  other: "Other",
};

export function formatPaymentMethod(method?: string | null): string {
  if (!method) return "—";
  if (method in PAYMENT_METHOD_LABELS) {
    return PAYMENT_METHOD_LABELS[method as PaymentMethod];
  }
  return method.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatAccountType(type?: string | null): string {
  if (!type) return "Other";
  if (type in ACCOUNT_TYPE_LABELS) {
    return ACCOUNT_TYPE_LABELS[type as AccountType];
  }
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export const FREQUENCIES = ["daily", "weekly", "monthly", "quarterly", "yearly"] as const;
export type Frequency = (typeof FREQUENCIES)[number];

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

export const CATEGORY_KINDS = ["expense", "income", "both"] as const;
export type CategoryKind = (typeof CATEGORY_KINDS)[number];

export const GOAL_STATUSES = ["active", "achieved", "archived"] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

export const TYPE_LABELS: Record<TransactionType, string> = {
  expense: "Expense",
  income: "Income",
  transfer: "Transfer",
};

/** Default category set seeded for every new user. Colors are theme-neutral. */
export interface DefaultCategory {
  /**
   * Permanent identity of a built-in category, stored as Category.systemKey.
   * Features that need a specific default category (the subscriptions
   * insight, auto-categorize) look it up by this, so they keep working after
   * the user renames it. Never change an existing key.
   */
  key: string;
  name: string;
  icon: CategoryIconKey;
  color: string;
  kind: CategoryKind;
}

/**
 * Warm, earthy category palette — clay, ochre, olive, terracotta and ink.
 * Deliberately kept inside the parchment/coral family so category swatches and
 * charts never fight the surface. No saturated cool primaries.
 */
export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { key: "housing", name: "Housing", icon: "house", color: "#8c5a3c", kind: "expense" },        // walnut
  { key: "food", name: "Food", icon: "biryani", color: "#d88060", kind: "expense" },       // clay coral
  { key: "groceries", name: "Groceries", icon: "groceries", color: "#7d8c4a", kind: "expense" }, // olive
  { key: "transportation", name: "Transportation", icon: "car", color: "#4f7a72", kind: "expense" },  // teal-slate
  { key: "education", name: "Education", icon: "graduation", color: "#4a6785", kind: "expense" }, // muted indigo
  { key: "healthcare", name: "Healthcare", icon: "healthcare", color: "#b84b3a", kind: "expense" },   // brick
  { key: "entertainment", name: "Entertainment", icon: "cinema", color: "#a4566e", kind: "expense" }, // plum
  { key: "shopping", name: "Shopping", icon: "shopping-bag", color: "#c96f4f", kind: "expense" },    // burnt clay
  { key: "subscriptions", name: "Subscriptions", icon: "subscription", color: "#6d5b8c", kind: "expense" },     // dusty violet
  { key: "bills-utilities", name: "Bills & Utilities", icon: "utilities", color: "#5a7a8c", kind: "expense" },// slate blue
  { key: "travel", name: "Travel", icon: "airplane", color: "#3f7d6e", kind: "expense" },        // pine
  { key: "personal", name: "Personal", icon: "personal-hygiene", color: "#c9942f", kind: "expense" },       // ochre
  { key: "family", name: "Family", icon: "family-insurance", color: "#96604f", kind: "expense" },        // rosewood
  { key: "bank-charges", name: "Bank Charges", icon: "payment", color: "#6b6b63", kind: "expense" },// stone
  { key: "salary", name: "Salary", icon: "money-sack", color: "#2c6b4f", kind: "income" },        // deep green
  { key: "business", name: "Business", icon: "suitcase", color: "#3f6b6b", kind: "income" },
  { key: "investments", name: "Investments", icon: "profits", color: "#557a3f", kind: "income" },
  { key: "other-income", name: "Other Income", icon: "dollars", color: "#4f8060", kind: "income" },
  { key: "other", name: "Other", icon: "more", color: "#8a8578", kind: "both" },
];

/**
 * Ordered chart palette for anything breaking a total down by category (the
 * spending donut, etc). Reuses the curated DEFAULT_CATEGORIES colors above —
 * picked for the warm parchment/coral theme and, unlike a category's own
 * (possibly randomly-assigned) accent color, guaranteed to read as
 * distinct, harmonious slices when several sit next to each other. Colors
 * are assigned by position, not by category identity.
 */
export const CATEGORY_CHART_COLORS = DEFAULT_CATEGORIES.map((c) => c.color);

export function isTransactionType(v: string): v is TransactionType {
  return (TRANSACTION_TYPES as readonly string[]).includes(v);
}
