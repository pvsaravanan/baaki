import type { TransactionType } from "@/lib/constants";

export const TYPE_OPTIONS: { value: TransactionType; label: string }[] = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfer" },
  { value: "refund", label: "Refund" },
];

export interface PartRow {
  amount: string;
  categoryId: string;
  accountId: string;
}

export interface ShareRow {
  contactId: string;
  amount: string;
  percent: string;
  weight: string;
}
