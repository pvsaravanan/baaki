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
import type { ContactDTO } from "@/lib/types";
import type { ContactShareRow } from "@/lib/contacts-service";

/** Settle everything open with one person at once, moving only the difference. */
export function NetSettleModal({
  contact,
  shares,
  open,
  onClose,
  onSettled,
}: {
  contact: ContactDTO;
  shares: ContactShareRow[];
  open: boolean;
  onClose: () => void;
  onSettled: () => void;
}) {
  const { accounts, preference, goalMoney } = useAppData();
  const toast = useToast();
  const confirm = useConfirm();
  const hasAccounts = accounts.length > 0;
  const [record, setRecord] = useState(hasAccounts);
  const [accountId, setAccountId] = useState(preference.defaultAccountId ?? (accounts.find((a) => !a.isArchived) ?? accounts[0])?.id ?? "");
  const [busy, setBusy] = useState(false);

  const pending = shares.filter((s) => !s.settled);
  const owedToYou = pending.filter((s) => s.direction !== "you_owe").reduce((sum, s) => sum + s.amount, 0);
  const youOwe = pending.filter((s) => s.direction === "you_owe").reduce((sum, s) => sum + s.amount, 0);
  const net = owedToYou - youOwe;

  // Paying out can dip into money reserved for goals: say so, as settling one entry does.
  const fromGoals = useMemo(() => {
    if (!record || !accountId) return 0;
    const change = actualBalanceChange(
      [],
      [
        { type: "repayment", amount: owedToYou, accountId },
        { type: "expense", amount: youOwe, accountId },
      ],
      accounts,
    );
    return goalMoneySpent(goalMoney.summary, change);
  }, [record, accountId, owedToYou, youOwe, accounts, goalMoney]);

  async function onConfirm() {
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
      await apiPost(`/api/contacts/${contact.id}/settle`, { record, accountId: record ? accountId : null });
      onSettled();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not settle up. Please try again.");
    }
    setBusy(false);
  }

  const headline =
    net > 0 ? `${contact.name} pays you` : net < 0 ? `You pay ${contact.name}` : "Nothing changes hands";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Settle net"
      description={`Settle all ${pending.length} open entries with ${contact.name} together.`}
      busy={busy}
      size="sm"
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy} className="flex-1">Cancel</Button>
          <Button onClick={onConfirm} loading={busy} disabled={pending.length === 0} className="flex-1">Settle net</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <dl className="space-y-1.5 rounded-none border border-border bg-surface-2 px-3 py-2 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-muted">Owes you</dt>
            <dd><Money paise={owedToYou} tone="income" className="font-medium" /></dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted">You owe</dt>
            <dd><Money paise={youOwe} tone="expense" className="font-medium" /></dd>
          </div>
          <div className="flex items-center justify-between border-t border-border-faint pt-1.5">
            <dt className="font-medium text-fg">{headline}</dt>
            <dd><Money paise={Math.abs(net)} tone={net >= 0 ? "income" : "expense"} className="text-lg font-semibold" /></dd>
          </div>
        </dl>
        <label className={cn("flex items-center gap-2 text-sm text-fg", !hasAccounts && "opacity-50")}>
          <input
            type="checkbox"
            checked={record}
            disabled={!hasAccounts}
            onChange={(e) => setRecord(e.target.checked)}
            className="h-4 w-4"
          />
          Also record it in an account
        </label>
        {record && hasAccounts && (
          <Field label={net >= 0 ? "Deposit into" : "Pay from"} htmlFor="net-settle-account">
            <SelectMenu
              id="net-settle-account"
              value={accountId}
              onChange={setAccountId}
              options={accounts.map((a) => ({ value: a.id, label: a.name }))}
            />
          </Field>
        )}
        {record && (
          <p className="text-xs text-faint">
            What they owed you is added to the account (it isn&apos;t income). What you owed them is recorded as an expense.
          </p>
        )}
        <GoalMoneyNotice fromGoals={fromGoals} goalMoney={goalMoney} />
      </div>
    </Modal>
  );
}
