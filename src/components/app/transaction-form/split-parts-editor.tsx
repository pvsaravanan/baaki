import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { formatINR } from "@/lib/money";
import type { AccountDTO, CategoryDTO } from "@/lib/types";
import type { PartRow } from "./types";

/** Split-by-category/account editor: one card per part, plus a quick equal-split helper. */
export function SplitPartsEditor({
  parts,
  partsTotal,
  partsError,
  splitTotal,
  setSplitTotal,
  onSplitEqually,
  accounts,
  eligibleCategories,
  updatePart,
  addPart,
  removePart,
}: {
  parts: PartRow[];
  partsTotal: number;
  partsError?: string;
  splitTotal: string;
  setSplitTotal: (v: string) => void;
  onSplitEqually: () => void;
  accounts: AccountDTO[];
  eligibleCategories: CategoryDTO[];
  updatePart: (i: number, patch: Partial<PartRow>) => void;
  addPart: () => void;
  removePart: (i: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-label-md uppercase text-muted">Splits</span>
        <span className="tnum text-sm font-semibold text-fg">Total: {formatINR(partsTotal, { decimals: "always" })}</span>
      </div>
      {/* Quick equal-split: type a grand total, divide it across all parts. */}
      <div className="flex items-center gap-2">
        <Input
          inputMode="decimal"
          placeholder="Total ₹"
          value={splitTotal}
          onChange={(e) => setSplitTotal(e.target.value.replace(/[^0-9.]/g, ""))}
          className="w-32"
        />
        <Button type="button" variant="outline" size="sm" onClick={onSplitEqually}>
          Split {parts.length} ways
        </Button>
      </div>
      {parts.map((part, i) => (
        <div key={i} className="relative space-y-2 rounded-none border border-border bg-surface-2/40 p-3">
          {parts.length > 2 && (
            <button
              type="button"
              onClick={() => removePart(i)}
              aria-label={`Remove split ${i + 1}`}
              className="absolute right-2 top-2 text-faint hover:text-expense"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <p className="text-2xs font-medium uppercase text-faint">Split {i + 1}</p>
          <div className="grid grid-cols-2 gap-2">
            <Input
              inputMode="decimal"
              placeholder="Amount ₹"
              value={part.amount}
              onChange={(e) => updatePart(i, { amount: e.target.value.replace(/[^0-9.]/g, "") })}
            />
            <Select value={part.accountId} onChange={(e) => updatePart(i, { accountId: e.target.value })}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </Select>
          </div>
          <Select
            value={part.categoryId}
            invalid={!!partsError && !part.categoryId}
            onChange={(e) => updatePart(i, { categoryId: e.target.value })}
          >
            {!part.categoryId && <option value="">Choose a category…</option>}
            {eligibleCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>
      ))}
      {partsError && <p className="text-xs text-expense">{partsError}</p>}
      <button type="button" onClick={addPart} className="text-label-sm uppercase text-brand-hover hover:underline">
        + Add split
      </button>
    </div>
  );
}
