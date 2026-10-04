import type { TransactionType } from "@/lib/constants";

export const TYPE_OPTIONS: { value: TransactionType; label: string }[] = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfer" },
];

export interface PartRow {
  amount: string;
  categoryId: string;
  accountId: string;
}

export interface ShareRow {
  /** Who owes this share; a saved person with this name is used, else one is added. */
  name: string;
  amount: string;
  percent: string;
  weight: string;
}
