"use client";
import { Check, Layers } from "lucide-react";
import { AccountIcon } from "@/components/app/accounts/account-icon";
import { Money } from "@/components/money";
import { cn } from "@/lib/cn";
import { formatAccountType } from "@/lib/constants";
import type { AccountDTO } from "@/lib/types";

/**
 * Which accounts a budget counts spending from. `selected` holds account ids;
 * empty means "All accounts" — which also covers accounts added later.
 */

function Box({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border border-border",
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
        "flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors",
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
    <section>
      <h3 className="text-base font-bold text-fg">Apply to Accounts</h3>
      <p className="mb-2.5 mt-0.5 text-body-sm text-muted">
        Choose where this budget counts spending from. Selected accounts are added together.
      </p>

      <div role="group" aria-label="Accounts" className="divide-y divide-border/25 overflow-hidden rounded-xl border border-border">
        <Row checked={all} onToggle={() => onChange([])}>
          <Box checked={all} />
          <Layers aria-hidden className="h-5 w-5 shrink-0 text-fg" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-fg">All accounts</span>
            <span className="block truncate text-xs text-muted">Includes accounts you add later</span>
          </span>
        </Row>
        {accounts.map((a) => (
          <Row key={a.id} checked={isOn(a.id)} onToggle={() => toggle(a.id)}>
            <Box checked={isOn(a.id)} />
            <AccountIcon account={a} size={28} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-fg">
                {a.name}
                {a.isArchived && <span className="ml-1.5 text-xs font-normal text-muted">(archived)</span>}
              </span>
              <span className="block truncate text-xs text-muted">{formatAccountType(a.type)}</span>
            </span>
            <Money paise={a.balance} tone={a.balance >= 0 ? "default" : "expense"} className="shrink-0 text-xs text-fg" />
          </Row>
        ))}
      </div>

      {!all && (
        <p className="mt-2 text-xs text-muted">Accounts you add later won&apos;t count unless you choose All accounts.</p>
      )}
    </section>
  );
}
