import { Field } from "@/components/ui/field";
import { SelectMenu } from "@/components/ui/select-menu";
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
          <SelectMenu
            id="category"
            value={categoryId}
            invalid={!!categoryError}
            onChange={(v) => {
              if (v === "__new__") {
                onNewCategory();
              } else {
                setCategoryId(v);
                setTouchedCategory(true);
              }
            }}
            options={[
              ...(!categoryId ? [{ value: "", label: "Choose a category…" }] : []),
              ...eligibleCategories.map((c) => ({ value: c.id, label: c.name })),
              { value: "__new__", label: "+ Create new category…" },
            ]}
          />
          {categoryError && <p className="text-xs text-expense">{categoryError}</p>}
        </div>
      )}

      <Field label={isTransfer ? "From account" : "Account"} htmlFor="account" error={accountError} className="col-span-2 sm:col-span-1">
        <SelectMenu
          id="account"
          value={accountId}
          invalid={!!accountError}
          onChange={setAccountId}
          options={accounts.map((a) => ({ value: a.id, label: a.name }))}
        />
      </Field>

      {isTransfer && (
        <Field label="To account" htmlFor="toAccount" error={transferAccountError} className="col-span-2 sm:col-span-1">
          <SelectMenu
            id="toAccount"
            value={transferAccountId}
            invalid={!!transferAccountError}
            onChange={setTransferAccountId}
            options={[{ value: "", label: "Select…" }, ...accounts.filter((a) => a.id !== accountId).map((a) => ({ value: a.id, label: a.name }))]}
          />
        </Field>
      )}
    </div>
  );
}
