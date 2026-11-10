"use client";
import { useState } from "react";
import { ArrowLeft, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { INPUT_BASE } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { displayAmount } from "@/lib/amount-keypad";
import { cn } from "@/lib/cn";
import { ApiError, apiPut } from "@/lib/http";
import { toPaise, toRupees } from "@/lib/money";
import type { MonthKey } from "@/lib/dates";
import type { CategoryDTO } from "@/lib/types";
import { useAppData } from "./app-data";
import { BudgetAccountsField } from "./budget-accounts";
import type { BudgetData } from "./budgets-view";
import { CategoryIcon } from "./category-icon";

const ROW = "flex items-center gap-3 rounded-xl border border-border/25 bg-brand-soft/20 px-3";
const ICON = "flex h-11 w-11 shrink-0 items-center justify-center";

/** Digits and one dot, with at most two decimals. */
function sanitizeAmount(value: string): string {
  const [whole, ...rest] = value.replace(/[^0-9.]/g, "").split(".");
  return rest.length === 0 ? whole : `${whole}.${rest.join("").slice(0, 2)}`;
}

/** A rupee amount: grouped ("60,000") to read, plain while it's being typed, so the cursor stays put. */
function AmountInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      inputMode="decimal"
      value={focused || !value ? value : displayAmount(value)}
      onChange={(e) => onChange(sanitizeAmount(e.target.value))}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholder="0"
      aria-label={label}
      className={cn(INPUT_BASE, "tnum !w-28 shrink-0 !rounded-lg border-border !px-2.5 !py-2 focus:border-brand min-[380px]:!w-[8.5rem]")}
    />
  );
}

function CoinStack() {
  return (
    <svg aria-hidden viewBox="0 0 80 64" className="h-14 w-[70px] shrink-0 text-fg" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M0 62 C8 40 28 24 56 22 V62 Z" fill="hsl(var(--brand-soft))" stroke="none" />
      <path d="M50 3 V10 M36 10 L42 14" strokeLinecap="round" />
      <path d="M46 24 V50 C46 54 53 57 62 57 C71 57 78 54 78 50 V24" fill="hsl(var(--surface))" />
      <path d="M46 33 C46 37 53 40 62 40 C71 40 78 37 78 33 M46 42 C46 46 53 49 62 49 C71 49 78 46 78 42" />
      <ellipse cx="62" cy="24" rx="16" ry="7" fill="hsl(var(--brand-soft))" />
      <path d="M24 42 V54 C24 58 31 61 40 61 C49 61 56 58 56 54 V42" fill="hsl(var(--surface))" />
      <ellipse cx="40" cy="42" rx="16" ry="7" fill="hsl(var(--brand-soft))" />
    </svg>
  );
}

export function BudgetEditor({
  onClose,
  budget,
  categories,
  monthKey,
}: {
  onClose: () => void;
  budget: BudgetData;
  categories: CategoryDTO[];
  monthKey: MonthKey;
}) {
  const toast = useToast();
  const { refresh, accounts } = useAppData();
  const isNew = budget.overallLimit == null && budget.lines.length === 0;

  // Archived accounts aren't offered, unless the budget already covers one.
  const [accountIds, setAccountIds] = useState<string[]>(budget.accountIds);
  const pickable = accounts.filter((a) => !a.isArchived || budget.accountIds.includes(a.id));

  const currentLimits = new Map(budget.lines.map((l) => [l.categoryId, l.limit]));

  // Saving replaces the whole category set, so the form must list every
  // category that already has a limit — including ones now inactive or
  // income-kind. Omitting them would silently delete their budgets.
  const budgetable = categories.filter(
    (c) => (c.kind !== "income" && c.isActive) || currentLimits.has(c.id),
  );

  const [overall, setOverall] = useState(
    budget.overallLimit != null ? String(toRupees(budget.overallLimit)) : "",
  );
  const [limits, setLimits] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const c of budgetable) {
      const existing = currentLimits.get(c.id);
      init[c.id] = existing != null ? String(toRupees(existing)) : "";
    }
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      let overallLimit: number | null = null;
      if (overall.trim()) {
        const p = toPaise(overall);
        overallLimit = p > 0 ? p : null;
      }
      const cats: { categoryId: string; limit: number }[] = [];
      for (const [categoryId, value] of Object.entries(limits)) {
        if (!value.trim()) continue;
        const paise = toPaise(value);
        if (paise > 0) cats.push({ categoryId, limit: paise });
      }
      await apiPut("/api/budgets", {
        year: monthKey.year,
        month: monthKey.month,
        overallLimit,
        categories: cats,
        accountIds,
      });
      toast.success("Budget saved");
      onClose();
      refresh();
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error && e.message.startsWith("Invalid amount")
            ? "Please enter valid rupee amounts."
            : "Could not save budget. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  const title = isNew ? "Create Budget" : "Edit Budget";

  return (
    <Modal open fullScreen onClose={onClose} title={title} busy={saving}>
      <div className="flex min-h-full flex-col">
        <div className="flex-1 space-y-5 px-4 pb-4 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:pt-4">
          <header className="flex items-start gap-3">
            <button type="button" onClick={onClose} disabled={saving} aria-label="Back" className="-ml-1 p-1 text-fg disabled:opacity-50">
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div className="min-w-0 flex-1">
              <h2 className="text-headline-sm tracking-normal text-fg">{title}</h2>
              <p className="mt-1 text-body-sm text-muted">Amounts are in rupees. Leave a field empty to remove that limit.</p>
            </div>
            <CoinStack />
          </header>

          {error && (
            <p role="alert" className="rounded-lg border border-expense/30 bg-expense/10 px-3 py-2 text-body-sm text-expense">
              {error}
            </p>
          )}

          <BudgetAccountsField accounts={pickable} selected={accountIds} onChange={setAccountIds} />

          <div className={cn(ROW, "py-3")}>
            <span className={cn(ICON, "text-fg")}>
              <Target className="h-8 w-8" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-fg">Overall Monthly Limit (₹)</p>
              <p className="mt-0.5 text-xs text-muted">Total budget across all categories.</p>
            </div>
            <AmountInput value={overall} onChange={setOverall} label="Overall monthly limit in rupees" />
          </div>

          <section>
            <h3 className="mb-2 text-base font-bold text-fg">Per-category Limits</h3>
            <div className="space-y-2">
              {budgetable.map((c) => (
                <div key={c.id} className={cn(ROW, "py-2")}>
                  <span className={ICON} style={{ color: c.color }}>
                    <CategoryIcon icon={c.icon} size={36} />
                  </span>
                  <span className="line-clamp-2 min-w-0 flex-1 text-[13px] font-bold leading-tight text-fg [overflow-wrap:anywhere]">{c.name}</span>
                  <AmountInput
                    value={limits[c.id] ?? ""}
                    onChange={(v) => setLimits((prev) => ({ ...prev, [c.id]: v }))}
                    label={`${c.name} budget in rupees`}
                  />
                </div>
              ))}
            </div>
          </section>
        </div>

        <footer className="sticky bottom-0 grid grid-cols-2 gap-3 border-t border-border/20 bg-surface px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 sm:pb-4">
          <Button size="lg" variant="outline" onClick={onClose} disabled={saving} className="w-full !rounded-lg">
            Cancel
          </Button>
          <Button size="lg" onClick={handleSave} loading={saving} className="w-full !rounded-lg">
            {isNew ? "Create Budget" : "Save Budget"}
          </Button>
        </footer>
      </div>
    </Modal>
  );
}
