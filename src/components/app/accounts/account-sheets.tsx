"use client";
import Link from "next/link";
import { ArchiveRestore, ChevronRight, List, Pencil, Trash2 } from "lucide-react";
import { accountTotals, groupAccounts } from "@/lib/account-groups";
import { formatAccountType } from "@/lib/constants";
import { formatINR } from "@/lib/money";
import type { AccountDTO } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Sheet } from "../sheet";
import { AccountIcon } from "./account-icon";
import { balanceTone, HIDDEN_AMOUNT } from "./account-row";

const ACTION = "flex w-full items-center gap-3 border-b border-border/10 py-3.5 text-left text-body-sm font-medium text-fg last:border-b-0";

/** What can be done with one account. */
export function AccountActionsSheet({
  account,
  hidden,
  onClose,
  onEdit,
  onDelete,
  onRestore,
}: {
  account: AccountDTO | null;
  hidden: boolean;
  onClose: () => void;
  onEdit: (a: AccountDTO) => void;
  onDelete: (a: AccountDTO) => void;
  onRestore: (a: AccountDTO) => void;
}) {
  return (
    <Sheet open={!!account} onClose={onClose} title={account?.name}>
      {account && (
        <div className="pb-2">
          <div className="mb-2 flex items-center gap-3">
            <AccountIcon account={account} size={36} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-muted">{formatAccountType(account.type)}</p>
              <p className={cn("tnum text-headline-sm", hidden ? "text-fg" : balanceTone(account))}>
                {hidden ? HIDDEN_AMOUNT : formatINR(account.balance)}
              </p>
            </div>
          </div>
          <Link href={`/transactions?accountId=${encodeURIComponent(account.id)}`} onClick={onClose} className={ACTION}>
            <List className="h-5 w-5 shrink-0" />
            <span className="flex-1">View transactions</span>
            <ChevronRight className="h-5 w-5 shrink-0" />
          </Link>
          <button type="button" onClick={() => onEdit(account)} className={ACTION}>
            <Pencil className="h-5 w-5 shrink-0" />
            Edit account
          </button>
          {account.isArchived && (
            <button type="button" onClick={() => onRestore(account)} className={ACTION}>
              <ArchiveRestore className="h-5 w-5 shrink-0" />
              Restore account
            </button>
          )}
          <button type="button" onClick={() => onDelete(account)} className={cn(ACTION, "text-expense")}>
            <Trash2 className="h-5 w-5 shrink-0" />
            Delete account
          </button>
        </div>
      )}
    </Sheet>
  );
}

function SummaryLine({ label, amount, strong, tone }: { label: string; amount: string; strong?: boolean; tone?: string }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3 py-1.5 text-body-sm", strong ? "font-bold text-fg" : "text-muted")}>
      <span className="min-w-0">{label}</span>
      <span className={cn("tnum shrink-0", tone ?? "text-fg")}>{amount}</span>
    </div>
  );
}

/** Active accounts added up: what they hold, what they owe, and each group's share. */
export function AccountSummarySheet({
  open,
  accounts,
  hidden,
  onClose,
}: {
  open: boolean;
  accounts: AccountDTO[];
  hidden: boolean;
  onClose: () => void;
}) {
  const { held, owed, net } = accountTotals(accounts);
  const show = (paise: number) => (hidden ? HIDDEN_AMOUNT : formatINR(paise));
  return (
    <Sheet open={open} onClose={onClose} title="Account Summary">
      <div className="pb-2">
        <SummaryLine label="You have" amount={show(held)} />
        <SummaryLine label="You owe" amount={show(owed)} />
        <div className="mt-1 border-t border-border/20 pt-1">
          <SummaryLine label="Total balance" amount={show(net)} strong />
        </div>

        <p className="mb-1 mt-4 text-label-sm uppercase tracking-wider text-muted">By group</p>
        {groupAccounts(accounts).map((g) => (
          <SummaryLine key={g.label} label={`${g.label} (${g.accounts.length})`} amount={show(g.total)} />
        ))}
      </div>
    </Sheet>
  );
}
