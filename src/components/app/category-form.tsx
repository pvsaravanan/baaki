"use client";
import { useEffect, useState } from "react";
import { ArrowLeft, Power, Tag, Target } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAppData } from "./app-data";
import { ApiError, apiPatch, apiPost } from "@/lib/http";
import { toPaise, toRupees } from "@/lib/money";
import { CATEGORY_KINDS, type CategoryKind } from "@/lib/constants";
import { leastUsedColor } from "@/lib/category-colors";
import { CategoryColorPicker } from "./category-color-picker";
import type { CategoryDTO } from "@/lib/types";
import { resolveCategoryIcon } from "@/lib/category-icons";
import { CategoryIconPicker } from "./category-icon-picker";

const CARD = "rounded-xl border";

const KIND_LABELS: Record<CategoryKind, string> = {
  expense: "Expense",
  income: "Income",
  both: "Both / Other",
};

export function CategoryForm({
  initial,
  defaultKind = "expense",
  onSaved,
  onCancel,
  onBusyChange,
}: {
  initial: CategoryDTO | null;
  /** The kind a new category starts on. */
  defaultKind?: CategoryKind;
  onSaved: (categories: CategoryDTO[]) => void;
  onCancel: () => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const editing = !!initial;
  const { categories } = useAppData();
  const [name, setName] = useState(initial?.name ?? "");
  const [kind, setKind] = useState<CategoryKind>(initial?.kind ?? defaultKind);
  const [icon, setIcon] = useState<string>(resolveCategoryIcon(initial?.icon));
  // A new category starts on the palette colour fewest categories use.
  const [color, setColor] = useState(() => initial?.color ?? leastUsedColor(categories.map((c) => c.color)));
  const [budget, setBudget] = useState(
    initial?.monthlyBudget != null ? String(toRupees(initial.monthlyBudget)) : "",
  );
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => onBusyChange?.(saving), [saving, onBusyChange]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setFormError(null);

    const localErrors: Record<string, string> = {};
    if (!name.trim()) localErrors.name = "Name is required";

    let monthlyBudget: number | null = null;
    if (budget.trim()) {
      try {
        monthlyBudget = toPaise(budget);
      } catch {
        localErrors.monthlyBudget = "Enter a valid amount";
      }
      if (monthlyBudget !== null && monthlyBudget <= 0) {
        localErrors.monthlyBudget = "Budget must be greater than zero";
      }
    }
    if (Object.keys(localErrors).length) {
      setErrors(localErrors);
      return;
    }

    const payload = { name: name.trim(), kind, icon, color, monthlyBudget, isActive };

    setSaving(true);
    try {
      const res = editing
        ? await apiPatch<{ categories: CategoryDTO[] }>(`/api/categories/${initial!.id}`, payload)
        : await apiPost<{ categories: CategoryDTO[] }>("/api/categories", payload);
      onSaved(res.categories);
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
        if (err.fields) setErrors(err.fields);
      } else setFormError("Could not save. Please try again.");
      setSaving(false);
    }
  }

  const heading = editing ? "Edit Category" : "Add Category";

  return (
    <form onSubmit={onSubmit} className="flex min-h-full flex-col" noValidate>
      <div className="flex-1 space-y-3 px-4 pb-4 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:pt-4">
        <header>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            aria-label="Back"
            className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl border border-border text-fg transition-colors active:bg-surface-2 disabled:opacity-50"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-headline-md text-fg">{heading}</h2>
          <p className="mt-1 text-body-sm text-muted">
            {editing ? "Change its name, icon, colour or budget." : "Name it, pick a kind, and optionally set a monthly budget."}
          </p>
        </header>

        {formError && (
          <p role="alert" className="rounded-lg border border-expense/30 bg-expense/10 px-3 py-2 text-body-sm text-expense">
            {formError}
          </p>
        )}

        <div role="radiogroup" aria-label="Kind" className="flex gap-2">
          {CATEGORY_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => setKind(k)}
              className={cn(
                "flex h-11 min-w-0 flex-1 items-center justify-center rounded-full border border-border text-[13px] font-bold transition-colors",
                kind === k ? "bg-brand text-brand-fg" : "text-fg",
              )}
            >
              {KIND_LABELS[k]}
            </button>
          ))}
        </div>

        <div>
          <label className={cn(CARD, "flex items-center gap-2.5 px-3 py-2.5 focus-within:border-brand", errors.name ? "border-expense" : "border-border")}>
            <span className="flex w-8 shrink-0 justify-center text-fg">
              <Tag aria-hidden className="h-6 w-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-fg">
                Name<span aria-hidden className="ml-0.5 text-expense">*</span>
              </span>
              <input
                id="cat-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                aria-invalid={!!errors.name}
                placeholder="e.g. Groceries, Freelance"
                className="w-full bg-transparent text-body-sm text-fg placeholder:text-muted focus:outline-none"
              />
            </span>
          </label>
          {errors.name && <p className="mt-1 text-xs text-expense">{errors.name}</p>}
        </div>

        <div>
          <label className={cn(CARD, "flex items-center gap-2.5 px-3 py-2.5 focus-within:border-brand", errors.monthlyBudget ? "border-expense" : "border-border")}>
            <span className="flex w-8 shrink-0 justify-center text-fg">
              <Target aria-hidden className="h-6 w-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-fg">
                Monthly budget <span className="font-medium text-muted">(optional)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="text-body-sm text-fg">₹</span>
                <input
                  id="cat-budget"
                  inputMode="decimal"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value.replace(/[^0-9.]/g, ""))}
                  aria-invalid={!!errors.monthlyBudget}
                  placeholder="None"
                  className="tnum w-full min-w-0 bg-transparent text-body-sm text-fg placeholder:text-muted focus:outline-none"
                />
              </span>
            </span>
          </label>
          {errors.monthlyBudget && <p className="mt-1 text-xs text-expense">{errors.monthlyBudget}</p>}
        </div>

        <section className={cn(CARD, "border-border p-3")}>
          <h3 className="mb-2 text-sm font-bold tracking-normal text-fg">Icon</h3>
          <CategoryIconPicker value={icon} onChange={setIcon} />
        </section>

        <section className={cn(CARD, "border-border p-3")}>
          <h3 className="mb-0.5 text-sm font-bold tracking-normal text-fg">Colour</h3>
          <p className="mb-2 text-xs text-muted">Used for this category in every chart and list.</p>
          <CategoryColorPicker value={color} onChange={setColor} />
        </section>

        <label className={cn(CARD, "flex items-start gap-2.5 border-border px-3 py-3")}>
          <span className="flex w-8 shrink-0 justify-center text-fg">
            <Power aria-hidden className="h-6 w-6" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-fg">Active</span>
            <span className="mt-0.5 block text-xs text-muted">Inactive categories are hidden when adding transactions.</span>
          </span>
          <Switch checked={isActive} onChange={setIsActive} label="Active" />
        </label>
      </div>

      <footer className="sticky bottom-0 grid grid-cols-2 gap-3 border-t border-border/20 bg-surface px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 sm:pb-4">
        <Button type="button" size="lg" variant="outline" onClick={onCancel} disabled={saving} className="w-full !rounded-lg !px-2">
          Cancel
        </Button>
        <Button type="submit" size="lg" loading={saving} className="w-full !rounded-lg !px-2">
          {editing ? "Save Changes" : "Add Category"}
        </Button>
      </footer>
    </form>
  );
}
