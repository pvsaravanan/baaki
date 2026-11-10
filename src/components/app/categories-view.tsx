"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { SwipeActions } from "@/components/ui/swipe-actions";
import { useToast } from "@/components/ui/toast";
import { useAppData } from "./app-data";
import type { CategoryDTO } from "@/lib/types";
import { cn } from "@/lib/cn";
import { CategoryIcon } from "./category-icon";
import { SectionIcon } from "./section-icon";
import { CategoryForm } from "./category-form";
import { useDeleteCategory } from "./category-actions";

type Tab = "expense" | "income";
const TABS: { value: Tab; label: string }[] = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
];

export function CategoriesView({
  categories: initial,
  transactionCounts,
}: {
  categories: CategoryDTO[];
  /** Transactions per category id. Missing only on the copy saved by an older version of the app. */
  transactionCounts?: Record<string, number>;
}) {
  const { refresh } = useAppData();
  const toast = useToast();
  const deleteCategory = useDeleteCategory();

  const [categories, setCategories] = useState(initial);
  // Resync when the loaded prop changes (e.g. a category created
  // elsewhere, such as the quick-add flow inside the transaction modal,
  // triggers refresh() — without this the list stays stale until a
  // full page reload since useState(initial) only seeds on first mount).
  useEffect(() => setCategories(initial), [initial]);
  const [tab, setTab] = useState<Tab>("expense");
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryDTO | null>(null);
  const [busy, setBusy] = useState(false);

  // A category for both kinds belongs on both tabs.
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return categories.filter((c) => (c.kind === tab || c.kind === "both") && (!q || c.name.toLowerCase().includes(q)));
  }, [categories, tab, query]);

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(c: CategoryDTO) {
    setEditing(c);
    setFormOpen(true);
  }

  async function onDelete(c: CategoryDTO) {
    const res = await deleteCategory(c);
    if (res) setCategories(res.categories);
  }

  if (categories.length === 0 && !formOpen) {
    return (
      <div className="rounded-xl border border-border/25">
        <EmptyState
          illustration={<SectionIcon section="categories" size={56} />}
          title="No categories yet"
          description="Create categories to organize your spending and income."
          action={
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4" />
              Add category
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div role="tablist" aria-label="Category type" className="flex gap-1 rounded-full border border-border/20 bg-surface-2/60 p-1">
        {TABS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={cn(
              "h-10 flex-1 rounded-full text-sm font-bold transition-colors",
              tab === value ? "bg-brand text-brand-fg" : "text-fg",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <label className="flex h-12 items-center gap-2.5 rounded-xl border border-border px-4 focus-within:border-brand">
        <Search aria-hidden className="h-5 w-5 shrink-0 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          enterKeyHint="search"
          aria-label="Search categories"
          placeholder="Search categories"
          className="min-w-0 flex-1 bg-transparent text-[16px] text-fg placeholder:text-muted focus:outline-none sm:text-body-sm [&::-webkit-search-cancel-button]:hidden"
        />
      </label>

      {shown.length === 0 ? (
        <p className="py-6 text-center text-body-sm text-muted">
          {query.trim() ? `No ${tab} category matches “${query.trim()}”.` : `No ${tab} categories yet.`}
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-2 lg:grid-cols-3">
          {shown.map((c, i) => (
            <CategoryCard
              key={`${tab}-${c.id}`}
              category={c}
              count={transactionCounts ? transactionCounts[c.id] ?? 0 : undefined}
              // A last card with no partner takes the whole row.
              wide={i === shown.length - 1 && i % 2 === 0}
              onEdit={() => openEdit(c)}
              onDelete={() => onDelete(c)}
            />
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={openAdd}
        className="flex h-14 w-full items-center justify-center gap-2.5 rounded-xl border border-dashed border-border/50 bg-brand-soft/20 text-sm font-bold text-fg transition-colors hover:bg-brand-soft/40 active:bg-brand-soft/50"
      >
        <Plus aria-hidden className="h-5 w-5" />
        Add Category
      </button>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit category" : "Add category"}
        description={editing ? undefined : "Name it, pick a kind, and optionally set a monthly budget."}
        busy={busy}
      >
        <CategoryForm
          key={editing?.id ?? "new"}
          initial={editing}
          defaultKind={tab}
          onSaved={(next) => {
            // Show a new category where it landed, if that's the other tab.
            const added = editing ? undefined : next.find((c) => !categories.some((old) => old.id === c.id));
            if (added && added.kind !== "both") setTab(added.kind);
            setCategories(next);
            refresh();
            toast.success(editing ? "Category updated" : "Category added");
            setFormOpen(false);
          }}
          onCancel={() => setFormOpen(false)}
          onBusyChange={setBusy}
        />
      </Modal>
    </div>
  );
}

function CategoryCard({
  category,
  count,
  wide,
  onEdit,
  onDelete,
}: {
  category: CategoryDTO;
  count?: number;
  wide: boolean;
  onEdit: () => void;
  onDelete: () => void | Promise<unknown>;
}) {
  // The name link is "stretched" (its ::after covers the card) so the whole
  // card opens the category; a swipe left shows Edit and Delete.
  return (
    <SwipeActions
      as="li"
      name={category.name}
      actionWidth={60}
      onEdit={onEdit}
      onDelete={onDelete}
      className={cn("min-w-0 rounded-xl border border-border bg-surface", wide && "col-span-2 lg:col-span-1")}
      contentClassName={cn(
        "flex h-full min-w-0 gap-2.5 bg-surface p-2.5 transition-colors hover:bg-brand-soft/20",
        // Beside the icon when there's room; the wide mono font needs the card's full width on a phone.
        wide ? "items-center" : "flex-col sm:flex-row sm:items-center",
        !category.isActive && "opacity-70",
      )}
    >
      <span className="flex shrink-0">
        <CategoryIcon icon={category.icon} size={40} />
      </span>
      <div className="min-w-0 flex-1">
        <Link
          href={`/categories/detail?id=${category.id}`}
          className="line-clamp-2 text-[13px] font-bold leading-tight text-fg [overflow-wrap:anywhere] after:absolute after:inset-0 after:rounded-xl after:content-[''] focus:outline-none focus-visible:underline"
        >
          {category.name}
        </Link>
        {count !== undefined && (
          <p className="mt-1 text-[11px] leading-tight text-muted">
            {count} {count === 1 ? "transaction" : "transactions"}
          </p>
        )}
        {!category.isActive && <Badge tone="neutral" className="mt-1">Inactive</Badge>}
      </div>
    </SwipeActions>
  );
}
