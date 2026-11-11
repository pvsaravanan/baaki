/**
 * Serialized DTOs returned by API routes and consumed by client components.
 * Dates are ISO strings; all money fields are integer paise (numbers).
 */
import type {
  AccountType,
  CategoryKind,
  Frequency,
  TransactionType,
} from "./constants";

export interface AccountDTO {
  id: string;
  name: string;
  type: AccountType;
  openingBalance: number;
  color: string;
  icon: string;
  isArchived: boolean;
  sortOrder: number;
  balance: number; // computed current balance (paise)
}

export interface CategoryDTO {
  id: string;
  name: string;
  icon: string;
  color: string;
  kind: CategoryKind;
  monthlyBudget: number | null;
  parentId: string | null;
  isActive: boolean;
  /** Permanent key of a built-in category (see DefaultCategory.key); null if user-made. */
  systemKey: string | null;
  sortOrder: number;
}

export interface TagDTO {
  id: string;
  name: string;
  color: string;
}

export interface TransactionDTO {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  merchant: string | null;
  date: string; // ISO date (YYYY-MM-DD)
  categoryId: string | null;
  accountId: string;
  transferAccountId: string | null;
  notes: string | null;
  recurringId: string | null;
  tags: string[];
  /** Other people's parts of this expense (empty when it isn't split). */
  splits: SplitDTO[];
}

/** One person's part of a split expense. */
export interface SplitDTO {
  id: string;
  name: string;
  amount: number;
  /** When they paid it back (ISO date), or null while it's still to collect. */
  settledAt: string | null;
  settledAccountId: string | null;
}

/** A share still to collect, with the expense it came from (the To collect screen). */
export interface OpenSplitDTO extends SplitDTO {
  transactionId: string;
  description: string;
  date: string;
  accountId: string;
}

/** Income and expense (paise) per month, keyed "YYYY-MM". */
export type MonthTotals = Record<string, { income: number; expense: number }>;

export interface RecurringDTO {
  id: string;
  name: string;
  type: "expense" | "income" | "transfer";
  amount: number;
  categoryId: string | null;
  accountId: string;
  transferAccountId: string | null;
  notes: string | null;
  frequency: Frequency;
  interval: number;
  startDate: string;
  endDate: string | null;
  nextOccurrence: string;
  lastPostedDate: string | null;
  isActive: boolean;
  autoPost: boolean;
}

export interface BudgetCategoryDTO {
  categoryId: string;
  limit: number;
}

export interface BudgetDTO {
  id: string | null;
  year: number;
  month: number;
  overallLimit: number | null;
  categories: BudgetCategoryDTO[];
  /** Accounts whose spending counts toward this budget; empty means all accounts. */
  accountIds: string[];
}

export interface PreferenceDTO {
  dashboardWidgets: string[];
  defaultAccountId: string | null;
  /** Ask for the phone's fingerprint / screen lock when the app opens. */
  appLock: boolean;
}
