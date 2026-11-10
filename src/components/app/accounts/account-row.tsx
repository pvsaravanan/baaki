import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/misc";
import { SwipeActions } from "@/components/ui/swipe-actions";
import { BALANCE_EXEMPT_ACCOUNT_TYPES, formatAccountType } from "@/lib/constants";
import { cn } from "@/lib/cn";
import { formatINR } from "@/lib/money";
import type { AccountDTO } from "@/lib/types";
import { AccountIcon } from "./account-icon";

/** Shown in place of an amount while balances are hidden. */
export const HIDDEN_AMOUNT = "••••••";

/** Red only when it's a problem: a card or loan below ₹0 is simply what's owed. */
export function balanceTone({ type, balance }: Pick<AccountDTO, "type" | "balance">): string {
  return balance < 0 && !BALANCE_EXEMPT_ACCOUNT_TYPES.includes(type) ? "text-expense" : "text-fg";
}

/** An account: tap for what can be done with it, swipe left for Edit and Delete. */
export function AccountRow({
  account,
  hidden,
  onOpen,
  onEdit,
  onDelete,
}: {
  account: AccountDTO;
  hidden: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void | Promise<unknown>;
}) {
  return (
    <SwipeActions
      as="li"
      name={account.name}
      onEdit={onEdit}
      onDelete={onDelete}
      className="min-w-0 rounded-xl border border-border/25 bg-surface"
    >
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "flex w-full items-center gap-3 bg-surface p-3 text-left transition-colors hover:bg-brand-soft/20 active:bg-brand-soft/30",
          account.isArchived && "opacity-70",
        )}
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center">
          <AccountIcon account={account} size={36} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="min-w-0 truncate text-sm font-bold text-fg">{account.name}</span>
            {account.isArchived && <Badge tone="neutral" className="shrink-0">Archived</Badge>}
          </span>
          <span className="mt-0.5 block truncate text-xs text-muted">{formatAccountType(account.type)}</span>
        </span>
        <span className={cn("tnum shrink-0 text-sm font-bold", hidden ? "text-fg" : balanceTone(account))}>
          {hidden ? HIDDEN_AMOUNT : formatINR(account.balance)}
        </span>
        <ChevronRight aria-hidden className="h-5 w-5 shrink-0 text-fg" />
      </button>
    </SwipeActions>
  );
}
