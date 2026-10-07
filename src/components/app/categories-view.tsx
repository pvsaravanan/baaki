"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MoreVertical, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Badge, EmptyState } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { ActionMenu, ActionMenuItem } from "@/components/ui/action-menu";
import { Money } from "@/components/money";
import { useToast } from "@/components/ui/toast";
import { useAppData } from "./app-data";
import type { CategoryKind } from "@/lib/constants";
import type { CategoryDTO } from "@/lib/types";
import { cn } from "@/lib/cn";
import { CategoryIcon } from "./category-icon";
import { SectionIcon } from "./section-icon";
import { CategoryForm } from "./category-form";
import { useDeleteCategory } from "./category-actions";

const KIND_GROUPS: { kind: CategoryKind; title: string }[] = [
  { kind: "expense", title: "Expense" },
  { kind: "income", title: "Income" },
  { kind: "both", title: "Both / Other" },
];

export function CategoriesView({ categories: initial }: { categories: CategoryDTO[] }) {
  const { refresh } = useAppData();
  const toast = useToast();
  const deleteCategory = useDeleteCategory();

  const [categories, setCategories] = useState(initial);
  // Resync when the server-rendered prop changes (e.g. a category created
  // elsewhere, such as the quick-add flow inside the transaction modal,
  // triggers router.refresh() — without this the list stays stale until a
  // full page reload since useState(initial) only seeds on first mount).
  useEffect(() => setCategories(initial), [initial]);
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryDTO | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, query]);

  const groups = useMemo(
    () => KIND_GROUPS.map((g) => ({ ...g, items: filtered.filter((c) => c.kind === g.kind) })),
    [filtered],
  );

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search categories…"
            className="pl-9"
            aria-label="Search categories"
          />
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4" />
          Add category
        </Button>
      </div>

      {categories.length === 0 ? (
        <div className="rounded-none border border-border bg-surface">
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
      ) : filtered.length === 0 ? (
        <div className="rounded-none border border-border bg-surface">
          <EmptyState icon={<Search className="h-5 w-5" />} title="No matches" description="No categories match your search." />
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((group) =>
            group.items.length === 0 ? null : (
              <section key={group.kind}>
                <h2 className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-faint">
                  {group.title}
                  <span className="text-faint">({group.items.length})</span>
                </h2>
                <ul className="divide-y divide-border rounded-none border border-border bg-surface">
                  {group.items.map((c) => (
                    <CategoryRow key={c.id} category={c} onEdit={() => openEdit(c)} onDelete={() => onDelete(c)} />
                  ))}
                </ul>
              </section>
            ),
          )}
        </div>
      )}

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
          onSaved={(next) => {
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

function CategoryRow({
  category,
  onEdit,
  onDelete,
}: {
  category: CategoryDTO;
  onEdit: () => void;
  onDelete: () => void;
}) {
  // The name link is "stretched" (its ::after covers the row) so the whole row
  // opens the category, with the actions menu layered above it.
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <li className={cn("group relative flex items-center gap-3 px-4 py-3", !category.isActive && "opacity-70")}>
      <CategoryIcon icon={category.icon} size={32} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/categories/${category.id}`}
            className="truncate text-sm font-medium text-fg after:absolute after:inset-0 after:content-[''] focus:outline-none focus-visible:underline"
          >
            {category.name}
          </Link>
          {!category.isActive && <Badge tone="neutral">Inactive</Badge>}
        </div>
        {category.monthlyBudget != null && (
          <p className="text-xs text-muted">
            Budget <Money paise={category.monthlyBudget} tone="default" className="font-medium" /> / month
          </p>
        )}
      </div>
      <div className="relative z-10 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={`Actions for ${category.name}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
        <ActionMenu open={menuOpen} onClose={() => setMenuOpen(false)} width={160} label={`Actions for ${category.name}`}>
          <ActionMenuItem icon={<Pencil className="h-4 w-4" />} onClick={() => { setMenuOpen(false); onEdit(); }}>
            Edit
          </ActionMenuItem>
          <ActionMenuItem icon={<Trash2 className="h-4 w-4" />} onClick={() => { setMenuOpen(false); onDelete(); }} danger>
            Delete
          </ActionMenuItem>
        </ActionMenu>
      </div>
    </li>
  );
}
