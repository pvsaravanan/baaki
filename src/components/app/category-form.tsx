"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { SelectMenu } from "@/components/ui/select-menu";
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

const KIND_LABELS: Record<CategoryKind, string> = {
  expense: "Expense",
  income: "Income",
  both: "Both / Other",
};

export function CategoryForm({
  initial,
  onSaved,
  onCancel,
  onBusyChange,
}: {
  initial: CategoryDTO | null;
  onSaved: (categories: CategoryDTO[]) => void;
  onCancel: () => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const editing = !!initial;
  const { categories } = useAppData();
  const [name, setName] = useState(initial?.name ?? "");
  const [kind, setKind] = useState<CategoryKind>(initial?.kind ?? "expense");
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

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {formError && (
        <div className="rounded-none border border-expense/30 bg-expense/10 px-3 py-2 text-sm text-expense">
          {formError}
        </div>
      )}

      <Field
        label="Name"
        htmlFor="cat-name"
        error={errors.name}
        required
      >
        <Input
          id="cat-name"
          value={name}
          invalid={!!errors.name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Groceries, Freelance"
        />
      </Field>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Kind" htmlFor="cat-kind">
          <SelectMenu
            id="cat-kind"
            value={kind}
            onChange={(v) => setKind(v as CategoryKind)}
            options={CATEGORY_KINDS.map((k) => ({ value: k, label: KIND_LABELS[k] }))}
          />
        </Field>

        <Field
          label="Monthly budget (₹)"
          htmlFor="cat-budget"
          error={errors.monthlyBudget}
          hint={errors.monthlyBudget ? undefined : "Optional"}
        >
          <Input
            id="cat-budget"
            inputMode="decimal"
            value={budget}
            invalid={!!errors.monthlyBudget}
            onChange={(e) => setBudget(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="None"
          />
        </Field>
      </div>

      <Field label="Icon">
        <CategoryIconPicker value={icon} onChange={setIcon} />
      </Field>

      <Field label="Colour" hint="Used for this category in every chart and list.">
        <CategoryColorPicker value={color} onChange={setColor} />
      </Field>

      <label className="flex items-center justify-between gap-3 rounded-none border border-border bg-surface px-3 py-2.5">
        <span className="text-sm text-fg">
          Active
          <span className="mt-0.5 block text-xs text-muted">Inactive categories are hidden when adding transactions.</span>
        </span>
        <Switch checked={isActive} onChange={setIsActive} label="Active" />
      </label>

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={saving} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" loading={saving} className="flex-1">
          {editing ? "Save changes" : "Add category"}
        </Button>
      </div>
    </form>
  );
}
