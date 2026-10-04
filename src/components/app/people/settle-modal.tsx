import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { SelectMenu } from "@/components/ui/select-menu";
import { Modal } from "@/components/ui/modal";
import { Money } from "@/components/money";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import { useAppData } from "../app-data";
import { ApiError, apiPost } from "@/lib/http";
import { formatINR } from "@/lib/money";
import { actualBalanceChange, goalMoneySpent } from "@/lib/goal-allocation";
import { GoalMoneyNotice, reservedGoalsText } from "../transaction-form/goal-money-notice";
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
  const { accounts, preference, goalMoney } = useAppData();
  const toast = useToast();
  const confirm = useConfirm();
  const hasAccounts = accounts.length > 0;
  // Default unchecked for a brand-new user with no accounts yet — there's
  // nothing to record into, so leaving this checked would silently no-op
  // instead of actually recording anything.
  const [record, setRecord] = useState(hasAccounts);
  const [accountId, setAccountId] = useState(preference.defaultAccountId ?? (accounts.find((a) => !a.isArchived) ?? accounts[0])?.id ?? "");
  const [busy, setBusy] = useState(false);

  const youOwe = share?.direction === "you_owe";

  // Paying someone back, recorded as an expense, is spending like any other:
  // say so if part of it would come out of money reserved for goals.
  const fromGoals = useMemo(() => {
    if (!share || !youOwe || !record || !accountId) return 0;
    const change = actualBalanceChange([], [{ type: "expense", amount: share.amount, accountId }], accounts);
    return goalMoneySpent(goalMoney.summary, change);
  }, [share, youOwe, record, accountId, accounts, goalMoney]);

  async function onConfirm() {
    if (!share) return;
    if (
      fromGoals > 0 &&
      !(await confirm({
        title: "Spend money reserved for goals?",
        message: `${formatINR(fromGoals)} of this comes from money allocated to ${reservedGoalsText(goalMoney.reserved)}. Your goals won't change — you'll be over-allocated until you adjust them or add income.`,
        confirmLabel: "Settle anyway",
      }))
    ) {
      return;
    }
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
            {youOwe ? "Also record this as an expense (money paid)" : "Also add the money to an account (not counted as income)"}
          </label>
          {!hasAccounts && (
            <p className="text-xs text-muted">Add an account first to record this settlement as a transaction.</p>
          )}
          {record && hasAccounts && (
            <Field label={youOwe ? "Pay from" : "Deposit into"} htmlFor="settle-account">
              <SelectMenu
                id="settle-account"
                value={accountId}
                onChange={setAccountId}
                options={accounts.map((a) => ({ value: a.id, label: a.name }))}
              />
            </Field>
          )}
          <GoalMoneyNotice fromGoals={fromGoals} goalMoney={goalMoney} />
        </div>
      )}
    </Modal>
  );
}
