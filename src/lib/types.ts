/**
 * Serialized DTOs returned by API routes and consumed by client components.
 * Dates are ISO strings; all money fields are integer paise (numbers).
 */
import type {
  AccountType,
  CategoryKind,
  Frequency,
  GoalStatus,
  PaymentMethod,
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
  paymentMethod: PaymentMethod | null;
  notes: string | null;
  recurringId: string | null;
  tags: string[];
  // People this expense is shared with (see ExpenseShare). Empty for most
  // transactions.
  shares: ShareDTO[];
}

export type ShareDirection = "owed_to_you" | "you_owe";

export interface ShareDTO {
  id: string;
  contactId: string | null; // null = "Someone": not named yet
  contactName: string;
  amount: number; // paise, this contact's share
  direction: ShareDirection;
  settled: boolean;
  settledAt: string | null;
}

export interface ContactDTO {
  id: string;
  name: string;
  color: string;
  isArchived: boolean;
  owedToYou: number; // unsettled amount the contact owes you (paise)
  youOwe: number; // unsettled amount you owe the contact (paise)
  net: number; // owedToYou - youOwe (positive: they owe you)
}

export interface RecurringDTO {
  id: string;
  name: string;
  type: "expense" | "income" | "transfer";
  amount: number;
  categoryId: string | null;
  accountId: string;
  transferAccountId: string | null;
  paymentMethod: PaymentMethod | null;
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

export interface GoalDTO {
  id: string;
  name: string;
  icon: string;
  targetAmount: number;
  targetDate: string | null;
  /** active | achieved (shown as "Completed") | archived */
  status: GoalStatus;
  /** Money set aside for this goal (paise) — the sum of its allocation history. */
  allocatedAmount: number;
  /** Newest first. */
  allocations: GoalAllocationDTO[];
  createdAt: string;
}

/**
 * One change to a goal's allocation: positive allocates, negative removes.
 * Never a transaction — the money stays in your accounts either way.
 */
export interface GoalAllocationDTO {
  id: string;
  amount: number;
  /** When it happened (full ISO timestamp). */
  at: string;
  note: string | null;
}

/** What every page needs to warn before spending money reserved for goals. */
export interface GoalMoneyDTO {
  summary: GoalsSummaryDTO;
  /** Goals currently holding money (archived ones release theirs). */
  reserved: { id: string; name: string; allocated: number }[];
}

/** Where your money stands once goal allocations are set aside. */
export interface GoalsSummaryDTO {
  actualBalance: number;
  totalAllocated: number;
  available: number;
  shortfall: number;
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
