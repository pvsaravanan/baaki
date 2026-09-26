import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { Money } from "@/components/money";
import { formatAccountType } from "@/lib/constants";
import type { AccountDTO } from "@/lib/types";
import { cn } from "@/lib/cn";
import { AccountIcon } from "./account-icon";

export function AccountCard({
  account,
  onEdit,
  onDelete,
}: {
  account: AccountDTO;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <li className={cn("group relative rounded-none border border-border bg-surface p-4 shadow-card", account.isArchived && "opacity-70")}>
      <div className="flex items-start gap-3">
        <AccountIcon account={account} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-fg">{account.name}</p>
            {account.isArchived && <Badge tone="neutral">Archived</Badge>}
          </div>
          <p className="text-xs text-muted">{formatAccountType(account.type)}</p>
        </div>
      </div>
      <div className="mt-3 flex items-end justify-between">
        <div>
          <p className="text-2xs text-faint">Current balance</p>
          <Money paise={account.balance} tone={account.balance < 0 ? "expense" : "default"} className="text-lg font-semibold" />
        </div>
        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 transition-opacity focus-within:opacity-100 sm:group-hover:opacity-100">
          <Button variant="ghost" size="icon" onClick={onEdit} aria-label={`Edit ${account.name}`}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete} aria-label={`Delete ${account.name}`}>
            <Trash2 className="h-4 w-4 text-expense" />
          </Button>
        </div>
      </div>
    </li>
  );
}
