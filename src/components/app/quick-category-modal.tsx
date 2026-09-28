"use client";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toast";
import { useAppData } from "./app-data";
import { apiPost, ApiError } from "@/lib/http";
import { CATEGORY_KINDS, CATEGORY_CHART_COLORS, type CategoryKind } from "@/lib/constants";
import type { CategoryDTO } from "@/lib/types";
import { DEFAULT_CATEGORY_ICON } from "@/lib/category-icons";
import { CategoryIconPicker } from "./category-icon-picker";

const KIND_OPTIONS: { value: CategoryKind; label: string }[] = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "both", label: "Both" },
];

export function QuickCategoryModal({
  open,
  onClose,
  defaultKind = "expense",
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  defaultKind?: CategoryKind;
  onCreated: (cat: CategoryDTO) => void;
}) {
  const { refresh } = useAppData();
  const toast = useToast();

  const [name, setName] = useState("");
  const [kind, setKind] = useState<CategoryKind>(defaultKind);
  const [icon, setIcon] = useState<string>(DEFAULT_CATEGORY_ICON);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The modal stays mounted between opens (only `open` toggles), so without
  // this, reopening it — even for a different defaultKind — would prefill
  // every field with whatever was left over from the last time it was used.
  useEffect(() => {
    if (open) {
      setName("");
      setKind(defaultKind);
      setIcon(DEFAULT_CATEGORY_ICON);
      setError(null);
    }
  }, [open, defaultKind]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Category name is required");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const res = await apiPost<{ createdId: string; categories: CategoryDTO[] }>("/api/categories", {
        name: name.trim(),
        kind,
        icon,
        color: CATEGORY_CHART_COLORS[Math.floor(Math.random() * CATEGORY_CHART_COLORS.length)],
        isActive: true,
      });
      refresh();
      // Resolve by the returned id, not by name — a case-insensitive name match
      // could pick a different pre-existing category with the same name.
      const created =
        res.categories.find((c) => c.id === res.createdId) ??
        res.categories[res.categories.length - 1];
      toast.success(`Category "${name.trim()}" created`);
      onCreated(created);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create category.");
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create new category"
      description="Add a custom category to organize your transactions."
      size="sm"
      busy={saving}
    >
      <form onSubmit={handleCreate} className="space-y-4">
        {error && (
          <div className="rounded-none border border-expense/30 bg-expense/10 px-3 py-2 text-xs text-expense">
            {error}
          </div>
        )}

        <Field label="Category Type / Kind" htmlFor="kind">
          <Segmented
            value={kind}
            onChange={(k) => setKind(k)}
            options={KIND_OPTIONS}
            size="sm"
            className="w-full [&>button]:flex-1"
          />
        </Field>

        <Field label="Name" htmlFor="category-name" required>
          <Input
            id="category-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Pet Care, Gadgets, Freelance"
            autoFocus
          />
        </Field>

        <div>
          <label className="block text-label-sm uppercase text-muted">Icon</label>
          <div className="mt-1.5">
            <CategoryIconPicker value={icon} onChange={setIcon} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving} className="min-h-[40px] flex-1 sm:flex-none">
            Cancel
          </Button>
          <Button type="submit" size="sm" loading={saving} className="min-h-[40px] flex-1 sm:flex-none">
            <Plus className="h-4 w-4" />
            Create Category
          </Button>
        </div>
      </form>
    </Modal>
  );
}
