"use client";
import { Check, Layers, X } from "lucide-react";
import { AccountIcon } from "@/components/app/accounts/account-icon";
import { Money } from "@/components/money";
import { cn } from "@/lib/cn";
import { formatAccountType } from "@/lib/constants";
import type { AccountDTO } from "@/lib/types";

/**
 * Which accounts a budget counts spending from. `selected` holds account ids;
 * empty means "All accounts" — which also covers accounts added later.
 */

const CHIP = "inline-flex max-w-full items-center gap-1.5 border border-border bg-surface px-2 py-1 text-xs font-medium text-fg";

/** The accounts a budget covers, as small tags ("All accounts" when none are chosen). */
export function AccountChips({
  accounts,
  selected,
  onRemove,
  className,
}: {
  accounts: AccountDTO[];
  selected: string[];
  /** Adds a remove button to each tag. */
  onRemove?: (id: string) => void;
  className?: string;
}) {
  const chosen = selected.map((id) => accounts.find((a) => a.id === id)).filter((a): a is AccountDTO => !!a);
  if (chosen.length === 0) {
    return (
      <div className={cn("flex flex-wrap gap-1.5", className)}>
        <span className={CHIP}>
          <Layers aria-hidden className="h-3.5 w-3.5 shrink-0" />
          All accounts
        </span>
      </div>
    );
  }
  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)} aria-label="Selected accounts">
      {chosen.map((a) => (
        <li key={a.id} className={CHIP}>
          <AccountIcon account={a} size={16} />
          <span className="truncate">{a.name}</span>
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(a.id)}
              aria-label={`Remove ${a.name}`}
              className="-mr-1 flex h-4 w-4 shrink-0 items-center justify-center hover:bg-surface-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <X aria-hidden className="h-3 w-3" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

function Box({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-[18px] w-[18px] shrink-0 items-center justify-center border border-border",
        checked ? "bg-brand text-brand-fg" : "bg-surface",
      )}
    >
      {checked && <Check className="h-3 w-3" strokeWidth={3} />}
    </span>
  );
}

function Row({
  checked,
  onToggle,
  children,
}: {
  checked: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className={cn(
        "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40",
        checked ? "bg-brand-soft" : "hover:bg-surface-2",
      )}
    >
      {children}
    </button>
  );
}

/** The Accounts section of the budget form. */
export function BudgetAccountsField({
  accounts,
  selected,
  onChange,
}: {
  accounts: AccountDTO[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const all = selected.length === 0;
  const isOn = (id: string) => selected.includes(id);

  // Choosing the last account off again goes back to all accounts.
  const toggle = (id: string) => onChange(isOn(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  return (
    <div className="space-y-2.5">
      <div>
        <p className="text-xs font-medium text-muted">Accounts</p>
        <p className="mt-0.5 text-xs text-muted">
          Choose where this budget counts spending from. Spending in the selected accounts is added together.
        </p>
      </div>

      <div className="space-y-1.5" aria-live="polite">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
          {all ? "Counting" : `Counting ${selected.length} account${selected.length === 1 ? "" : "s"}`}
        </p>
        <AccountChips accounts={accounts} selected={selected} onRemove={all ? undefined : toggle} />
      </div>

      <div role="group" aria-label="Accounts" className="divide-y divide-border border border-border">
        <Row checked={all} onToggle={() => onChange([])}>
          <Box checked={all} />
          <Layers aria-hidden className="h-5 w-5 shrink-0 text-fg" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-fg">All accounts</span>
            <span className="block truncate text-xs text-muted">Includes accounts you add later</span>
          </span>
        </Row>
        {accounts.map((a) => (
          <Row key={a.id} checked={isOn(a.id)} onToggle={() => toggle(a.id)}>
            <Box checked={isOn(a.id)} />
            <AccountIcon account={a} size={24} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-fg">
                {a.name}
                {a.isArchived && <span className="ml-1.5 text-xs font-normal text-muted">(archived)</span>}
              </span>
              <span className="block truncate text-xs text-muted">{formatAccountType(a.type)}</span>
            </span>
            <Money paise={a.balance} tone={a.balance >= 0 ? "muted" : "expense"} className="shrink-0 text-xs" />
          </Row>
        ))}
      </div>

      {!all && (
        <p className="text-xs text-muted">Accounts you add later won&apos;t count unless you choose All accounts.</p>
      )}
    </div>
  );
}
