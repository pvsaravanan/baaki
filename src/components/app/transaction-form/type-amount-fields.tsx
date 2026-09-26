import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/cn";
import type { CategoryDTO } from "@/lib/types";
import type { TransactionType } from "@/lib/constants";
import { TYPE_OPTIONS } from "./types";

/**
 * The type switch (Expense/Income/Transfer/Refund) with the Amount input
 * beneath it — or, when editing a split expense, a fixed "Split expense"
 * label instead of the switch (a saved split's type can't change) and no
 * amount input (each split part carries its own amount instead).
 */
export function TypeAndAmountFields({
  splitEnabled,
  type,
  setType,
  categories,
  setCategoryId,
  amount,
  setAmount,
  amountError,
  editing,
}: {
  splitEnabled: boolean;
  type: TransactionType;
  setType: (v: TransactionType) => void;
  categories: CategoryDTO[];
  setCategoryId: React.Dispatch<React.SetStateAction<string>>;
  amount: string;
  setAmount: (v: string) => void;
  amountError?: string;
  editing: boolean;
}) {
  return (
    <>
      {splitEnabled ? (
        <div className="rounded-none border border-border bg-surface-2 px-3 py-2 text-sm font-medium text-fg">
          Split expense
        </div>
      ) : (
        <Segmented
          value={type}
          onChange={(v) => {
            setType(v);
            setCategoryId((prev) => {
              if (v === "transfer") return "";
              const wantIncome = v === "income";
              const matches = (c: CategoryDTO) =>
                wantIncome ? c.kind === "income" || c.kind === "both" : c.kind === "expense" || c.kind === "both";
              const cat = categories.find((c) => c.id === prev);
              if (cat && matches(cat)) return prev;
              // Switching to a type the current category doesn't fit — clear
              // the selection so the user (or auto-suggest) can pick anew.
              return "";
            });
          }}
          options={TYPE_OPTIONS}
          className="w-full [&>button]:flex-1"
        />
      )}

      {!splitEnabled && (
        <div>
          <label htmlFor="amount" className="block text-label-md uppercase text-muted">
            Amount
          </label>
          <div className="relative mt-1.5">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-headline-sm text-muted">₹</span>
            <input
              id="amount"
              inputMode="decimal"
              autoFocus={!editing}
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="0"
              className={cn(
                "tnum w-full rounded-none border-2 bg-surface py-2.5 pl-10 pr-4 text-headline-md tracking-tight text-fg",
                "focus:outline-none focus:ring-2 focus:ring-ring/25",
                amountError ? "border-expense" : "border-border focus:border-brand",
              )}
            />
          </div>
          {amountError && <p className="mt-1 text-body-sm text-expense">{amountError}</p>}
        </div>
      )}
    </>
  );
}
