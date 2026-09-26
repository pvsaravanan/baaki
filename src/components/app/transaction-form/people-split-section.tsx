import { X } from "lucide-react";
import { Field, Input, Select } from "@/components/ui/field";
import { formatINR } from "@/lib/money";
import type { ContactDTO } from "@/lib/types";
import type { TransactionType } from "@/lib/constants";
import { calculateExpenseSplit, type ExpenseSplitMethod } from "@/lib/expense-split";
import { ExpenseSplitMethodPicker } from "../expense-split-method";
import type { ShareRow } from "./types";

/** "Split with people" — toggling it on shares this expense with contacts, in any of the three modes ExpenseSplitMethodPicker offers. */
export function PeopleSplitSection({
  type,
  peopleEnabled,
  setPeopleEnabled,
  shareMode,
  setShareMode,
  yourWeight,
  setYourWeight,
  shareRows,
  addShareRow,
  updateShare,
  removeShare,
  contacts,
  availableContacts,
  canAddPerson,
  selectedShareCount,
  shareAmountPaise,
  sharesTotal,
  yourShare,
  yourPercentage,
  totalForShares,
  sharesError,
  splitError,
}: {
  type: TransactionType;
  peopleEnabled: boolean;
  setPeopleEnabled: (v: boolean) => void;
  shareMode: ExpenseSplitMethod;
  setShareMode: (v: ExpenseSplitMethod) => void;
  yourWeight: string;
  setYourWeight: (v: string) => void;
  shareRows: ShareRow[];
  addShareRow: () => void;
  updateShare: (i: number, patch: Partial<ShareRow>) => void;
  removeShare: (i: number) => void;
  contacts: ContactDTO[];
  availableContacts: ContactDTO[];
  canAddPerson: boolean;
  selectedShareCount: number;
  shareAmountPaise: (row: ShareRow) => number;
  sharesTotal: number;
  yourShare: number;
  yourPercentage: ReturnType<typeof calculateExpenseSplit>["yourPercentage"];
  totalForShares: number;
  sharesError?: string;
  splitError: string | null;
}) {
  if (type !== "expense") return null;

  return (
    <div className="space-y-2 rounded-none border border-border p-3">
      <label className="flex items-center gap-2 text-sm text-fg">
        <input
          type="checkbox"
          checked={peopleEnabled}
          onChange={(e) => {
            setPeopleEnabled(e.target.checked);
            if (e.target.checked && shareRows.length === 0) addShareRow();
          }}
          className="h-4 w-4"
        />
        Split with people
      </label>
      {peopleEnabled && (
        <div className="space-y-3 pt-1">
          <ExpenseSplitMethodPicker value={shareMode} onChange={setShareMode} />
          {availableContacts.length === 0 && (
            <p className="text-xs text-faint">No active people yet — add one from the People page first.</p>
          )}
          {shareMode === "shares" && (
            <Field label="Your shares" htmlFor="your-split-weight" hint="Use 0 if none of this expense is yours.">
              <Input id="your-split-weight" inputMode="decimal" maxLength={24} value={yourWeight} onChange={(e) => setYourWeight(e.target.value)} placeholder="1" />
            </Field>
          )}
          {shareRows.map((row, i) => {
            const inputField = shareMode === "percent" ? "percent" : shareMode === "shares" ? "weight" : "amount";
            const personName = contacts.find((contact) => contact.id === row.contactId)?.name ?? `Person ${i + 1}`;
            return (
              <div key={i} className="space-y-2 border border-border-faint bg-surface-2 p-2">
                <div className="flex items-center gap-2">
                  <Select
                    aria-label={`Person ${i + 1}`}
                    value={row.contactId}
                    onChange={(e) => updateShare(i, { contactId: e.target.value })}
                    className="min-w-0 flex-1"
                  >
                    <option value="">Choose person…</option>
                    {availableContacts.map((c) => (
                      <option key={c.id} value={c.id} disabled={shareRows.some((other, index) => index !== i && other.contactId === c.id)}>
                        {c.name}{c.isArchived ? " (archived)" : ""}
                      </option>
                    ))}
                  </Select>
                  <button type="button" onClick={() => removeShare(i)} aria-label={`Remove ${personName} from split`} className="p-2">
                    <X className="h-4 w-4 text-faint hover:text-expense" />
                  </button>
                </div>
                <div className="flex items-end justify-between gap-3">
                  {shareMode !== "equal" && (
                    <Field
                      label={shareMode === "amounts" ? "Amount (₹)" : shareMode === "percent" ? "Percentage (%)" : "Shares"}
                      htmlFor={`split-value-${i}`}
                      className="w-36 min-w-0"
                    >
                      <Input
                        id={`split-value-${i}`}
                        aria-label={`${personName}: ${shareMode === "amounts" ? "amount" : shareMode === "percent" ? "percentage" : "shares"}`}
                        inputMode="decimal"
                        maxLength={24}
                        placeholder={shareMode === "shares" ? "1" : "0"}
                        value={row[inputField]}
                        onChange={(e) => updateShare(i, { [inputField]: e.target.value })}
                      />
                    </Field>
                  )}
                  <div className="ml-auto min-w-0 text-right">
                    <p className="text-2xs uppercase text-muted">Owes</p>
                    <output aria-label={`${personName} owes`} className="tnum break-words text-sm font-semibold text-fg">
                      {splitError ? "—" : formatINR(shareAmountPaise(row), { decimals: "always" })}
                    </output>
                  </div>
                </div>
              </div>
            );
          })}
          <button type="button" onClick={addShareRow} disabled={!canAddPerson} className="text-label-sm uppercase text-brand-hover hover:underline disabled:cursor-not-allowed disabled:opacity-50">
            + Add person
          </button>
          {shareMode === "equal" && (
            <p className="text-2xs text-faint">Split equally between you and {selectedShareCount} {selectedShareCount === 1 ? "other" : "others"}.</p>
          )}
          {(sharesError || splitError) && <p role="alert" className="text-xs text-expense">{sharesError || splitError}</p>}
          <div className="space-y-2 border-t border-border-faint pt-2 text-sm" aria-live="polite">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted">Others owe</span>
              <span className="tnum text-fg">{splitError ? "—" : formatINR(sharesTotal, { decimals: "always" })}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted">Your share{shareMode === "percent" && yourPercentage !== null ? ` (${yourPercentage}%)` : ""}</span>
              <span className="tnum font-semibold text-fg">{splitError ? "—" : formatINR(yourShare, { decimals: "always" })}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted">Expense total</span>
              <span className="tnum text-fg">{formatINR(totalForShares, { decimals: "always" })}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
