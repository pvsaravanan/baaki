import { Field, Select } from "@/components/ui/field";
import type { AccountDTO, CategoryDTO } from "@/lib/types";

/** Category + account (+ destination account for a transfer) — the non-split case. */
export function CategoryAccountFields({
  isTransfer,
  categoryId,
  setCategoryId,
  setTouchedCategory,
  categoryError,
  eligibleCategories,
  onNewCategory,
  accountId,
  setAccountId,
  accountError,
  accounts,
  transferAccountId,
  setTransferAccountId,
  transferAccountError,
}: {
  isTransfer: boolean;
  categoryId: string;
  setCategoryId: (id: string) => void;
  setTouchedCategory: (v: boolean) => void;
  categoryError?: string;
  eligibleCategories: CategoryDTO[];
  onNewCategory: () => void;
  accountId: string;
  setAccountId: (id: string) => void;
  accountError?: string;
  accounts: AccountDTO[];
  transferAccountId: string;
  setTransferAccountId: (id: string) => void;
  transferAccountError?: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {!isTransfer && (
        <div className="col-span-2 sm:col-span-1 space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="category" className="block text-label-md uppercase text-muted">
              Category
            </label>
            <button type="button" onClick={onNewCategory} className="text-label-sm uppercase text-brand-hover hover:underline">
              + New
            </button>
          </div>
          <Select
            id="category"
            value={categoryId}
            invalid={!!categoryError}
            onChange={(e) => {
              if (e.target.value === "__new__") {
                onNewCategory();
              } else {
                setCategoryId(e.target.value);
                setTouchedCategory(true);
              }
            }}
          >
            {!categoryId && <option value="">Choose a category…</option>}
            {eligibleCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
            <option value="__new__">+ Create new category…</option>
          </Select>
          {categoryError && <p className="text-xs text-expense">{categoryError}</p>}
        </div>
      )}

      <Field label={isTransfer ? "From account" : "Account"} htmlFor="account" error={accountError} className="col-span-2 sm:col-span-1">
        <Select id="account" value={accountId} invalid={!!accountError} onChange={(e) => setAccountId(e.target.value)}>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </Select>
      </Field>

      {isTransfer && (
        <Field label="To account" htmlFor="toAccount" error={transferAccountError} className="col-span-2 sm:col-span-1">
          <Select id="toAccount" value={transferAccountId} invalid={!!transferAccountError} onChange={(e) => setTransferAccountId(e.target.value)}>
            <option value="">Select…</option>
            {accounts.filter((a) => a.id !== accountId).map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </Select>
        </Field>
      )}
    </div>
  );
}
