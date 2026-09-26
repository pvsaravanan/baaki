import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Money } from "@/components/money";
import { useToast } from "@/components/ui/toast";
import { useAppData } from "../app-data";
import { ApiError, apiPost } from "@/lib/http";
import { cn } from "@/lib/cn";
import type { ContactShareRow } from "@/lib/contacts-service";

export function SettleModal({
  share,
  contactName,
  onClose,
  onSettled,
}: {
  share: ContactShareRow | null;
  contactName: string;
  onClose: () => void;
  onSettled: () => void;
}) {
  const { accounts, preference } = useAppData();
  const toast = useToast();
  const hasAccounts = accounts.length > 0;
  // Default unchecked for a brand-new user with no accounts yet — there's
  // nothing to record into, so leaving this checked would silently no-op
  // instead of actually recording anything.
  const [record, setRecord] = useState(hasAccounts);
  const [accountId, setAccountId] = useState(preference.defaultAccountId ?? accounts[0]?.id ?? "");
  const [busy, setBusy] = useState(false);

  const youOwe = share?.direction === "you_owe";

  async function onConfirm() {
    if (!share) return;
    setBusy(true);
    try {
      await apiPost(`/api/shares/${share.id}/settle`, {
        record,
        accountId: record ? accountId : null,
      });
      onSettled();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not settle up. Please try again.");
      setBusy(false);
    }
  }

  return (
    <Modal
      open={!!share}
      onClose={onClose}
      title="Settle up"
      description={
        share
          ? youOwe
            ? `Mark "${share.description}" as paid to ${contactName}.`
            : `Mark "${share.description}" as settled by ${contactName}.`
          : undefined
      }
      busy={busy}
      size="sm"
      footer={
        share && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose} disabled={busy} className="flex-1">Cancel</Button>
            <Button onClick={onConfirm} loading={busy} className="flex-1">Settle</Button>
          </div>
        )
      }
    >
      {share && (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-none border border-border bg-surface-2 px-3 py-2">
            <span className="text-sm text-muted">Amount</span>
            <Money paise={share.amount} tone={youOwe ? "expense" : "income"} className="text-lg font-semibold" />
          </div>
          <label className={cn("flex items-center gap-2 text-sm text-fg", !hasAccounts && "opacity-50")}>
            <input
              type="checkbox"
              checked={record}
              disabled={!hasAccounts}
              onChange={(e) => setRecord(e.target.checked)}
              className="h-4 w-4"
            />
            {youOwe ? "Also record this as an expense (money paid)" : "Also record this as income (money received)"}
          </label>
          {!hasAccounts && (
            <p className="text-xs text-muted">Add an account first to record this settlement as a transaction.</p>
          )}
          {record && hasAccounts && (
            <Field label={youOwe ? "Pay from" : "Deposit into"} htmlFor="settle-account">
              <Select id="settle-account" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </Select>
            </Field>
          )}
        </div>
      )}
    </Modal>
  );
}
