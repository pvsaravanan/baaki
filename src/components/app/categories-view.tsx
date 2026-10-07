"use client";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, MoreVertical, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Badge, EmptyState } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { ActionMenu, ActionMenuItem } from "@/components/ui/action-menu";
import { ScrollWindow, measureScrollWindows } from "@/components/ui/scroll-window";
import { shareHeight } from "@/lib/share-height";
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

const EXPANDED_KEY = "baaki:categories:expanded";
// An open section never gets squeezed below two rows.
const MIN_WINDOW = 100;

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
  // triggers refresh() — without this the list stays stale until a
  // full page reload since useState(initial) only seeds on first mount).
  useEffect(() => setCategories(initial), [initial]);
  const [query, setQuery] = useState("");
  // Every section starts folded; the ones the user opens are remembered between visits.
  const [expanded, setExpanded] = useState<Set<CategoryKind>>(new Set());
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(EXPANDED_KEY) ?? "[]");
      if (Array.isArray(saved)) setExpanded(new Set(saved.filter((k): k is CategoryKind => typeof k === "string")));
    } catch {
      /* storage unavailable or unreadable: everything stays folded */
    }
  }, []);
  function toggleGroup(kind: CategoryKind) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      try {
        localStorage.setItem(EXPANDED_KEY, JSON.stringify([...next]));
      } catch {
        /* not remembered, still works */
      }
      return next;
    });
  }
  // The open sections share the screen: each keeps what its rows need and the
  // longer ones split the rest, so every heading stays in view and a long list
  // scrolls inside its own window instead of pushing the others off screen.
  const areaRef = useRef<HTMLDivElement>(null);
  const spaceRef = useRef<number | null>(null);
  const [heights, setHeights] = useState<Record<string, number | undefined>>({});
  const relayout = useCallback(() => {
    const area = areaRef.current;
    if (!area) return;
    const windows = measureScrollWindows(area);
    if (windows.length === 0) {
      setHeights((prev) => (Object.keys(prev).length === 0 ? prev : {}));
      return;
    }
    const main = area.closest("main");
    // While the on-screen keyboard is up (typing in search), keep the last size.
    const typing = document.activeElement instanceof HTMLInputElement;
    if (main && !(typing && spaceRef.current !== null)) {
      const below = parseFloat(getComputedStyle(main).paddingBottom) || 0;
      const top = area.getBoundingClientRect().top - main.getBoundingClientRect().top + main.scrollTop;
      spaceRef.current = main.clientHeight - below - top;
    }
    const available = spaceRef.current ?? window.innerHeight - 320;
    const fixed = area.offsetHeight - windows.reduce((sum, w) => sum + w.box.offsetHeight, 0);
    const next = shareHeight(windows.map((w) => w.natural), available - fixed, MIN_WINDOW);
    const result: Record<string, number | undefined> = {};
    windows.forEach((w, i) => {
      result[w.kind] = next[i] >= w.natural - 1 ? undefined : next[i];
    });
    setHeights((prev) => {
      const same = Object.keys({ ...prev, ...result }).every((k) => prev[k] === result[k]);
      return same ? prev : result;
    });
  }, []);
  useLayoutEffect(relayout, [relayout, expanded, query, categories]);
  useEffect(() => {
    window.addEventListener("resize", relayout);
    const main = areaRef.current?.closest("main");
    const observer = main ? new ResizeObserver(relayout) : null;
    if (main) observer?.observe(main);
    return () => {
      window.removeEventListener("resize", relayout);
      observer?.disconnect();
    };
  }, [relayout]);

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
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="pl-9"
            aria-label="Search categories"
          />
        </div>
        <Button onClick={openAdd} className="shrink-0">
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
        <div ref={areaRef} className="flow-root space-y-4">
          {groups.map((group) => {
            if (group.items.length === 0) return null;
            // A search always shows its matches, even inside a folded section.
            const open = query.trim() !== "" || expanded.has(group.kind);
            const listId = `categories-${group.kind}`;
            return (
              <section key={group.kind}>
                <button
                  type="button"
                  onClick={() => toggleGroup(group.kind)}
                  aria-expanded={open}
                  aria-controls={listId}
                  className="mb-1 flex w-full items-center justify-between gap-2 py-1 text-left text-sm font-medium uppercase tracking-wide text-muted hover:text-fg"
                >
                  <span>
                    {group.title} <span className="text-faint">({group.items.length})</span>
                  </span>
                  <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", !open && "-rotate-90")} aria-hidden />
                </button>
                {open && (
                  <ScrollWindow
                    id={listId}
                    kind={group.kind}
                    height={heights[group.kind]}
                    className="rounded-xl border-2 border-border bg-surface"
                  >
                    <ul className="divide-y divide-border-faint">
                      {group.items.map((c) => (
                        <CategoryRow key={c.id} category={c} onEdit={() => openEdit(c)} onDelete={() => onDelete(c)} />
                      ))}
                    </ul>
                  </ScrollWindow>
                )}
              </section>
            );
          })}
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
    <li className={cn("relative flex items-center gap-3 py-1.5 pl-3 pr-1", !category.isActive && "opacity-70")}>
      <CategoryIcon icon={category.icon} size={32} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/categories/${category.id}`}
            className="truncate text-sm text-fg after:absolute after:inset-0 after:content-[''] focus:outline-none focus-visible:underline"
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
