"use client";
import { useMemo, useState } from "react";
import { Check, Plus, Search, X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { CategoryDTO } from "@/lib/types";
import { CategoryIcon } from "../category-icon";
import { Sheet } from "../sheet";

const TILE = "relative flex min-h-[92px] flex-col items-center justify-start gap-1.5 rounded-lg border px-0.5 py-2 text-center transition-colors";

export function CategoryPickerSheet({
  open,
  onClose,
  categories,
  selected,
  onPick,
  onCreateNew,
  subtitle = "Pick a category for this transaction.",
}: {
  open: boolean;
  onClose: () => void;
  categories: CategoryDTO[];
  selected: string;
  onPick: (id: string) => void;
  onCreateNew: () => void;
  subtitle?: string;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Choose category" bare>
      {/* Mounted only while open, so each opening starts with an empty search. */}
      <Picker categories={categories} selected={selected} subtitle={subtitle} onClose={onClose} onPick={onPick} onCreateNew={onCreateNew} />
    </Sheet>
  );
}

function Picker({
  categories,
  selected,
  subtitle,
  onClose,
  onPick,
  onCreateNew,
}: {
  categories: CategoryDTO[];
  selected: string;
  subtitle: string;
  onClose: () => void;
  onPick: (id: string) => void;
  onCreateNew: () => void;
}) {
  const [query, setQuery] = useState("");
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? categories.filter((c) => c.name.toLowerCase().includes(q)) : categories;
  }, [categories, query]);

  return (
    <>
      <div className="px-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-headline-sm tracking-normal text-fg">Choose Category</h2>
            <p className="mt-0.5 text-body-sm text-muted">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft/60 text-fg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <label className="mt-3 flex h-11 items-center gap-2.5 rounded-full border border-border px-4 focus-within:border-brand">
          <Search className="h-5 w-5 shrink-0 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            enterKeyHint="search"
            aria-label="Search categories"
            placeholder="Search categories..."
            className="min-w-0 flex-1 bg-transparent text-body-sm text-fg placeholder:text-muted focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
        </label>
      </div>

      {/* A steady height, so the sheet doesn't jump as a search narrows the grid. */}
      <div className="min-h-[50dvh] flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2 md:pb-4">
        {/* Four across, as long as that leaves room for names in the wide mono font. */}
        <div className="grid grid-cols-3 gap-2 min-[380px]:grid-cols-4">
          {matches.map((c) => {
            const active = c.id === selected;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  onPick(c.id);
                  onClose();
                }}
                className={cn(TILE, active ? "border-brand bg-brand-soft" : "border-border/20 bg-surface")}
              >
                <span className="flex h-11 w-11 items-center justify-center">
                  <CategoryIcon icon={c.icon} size={38} />
                </span>
                <TileName>{c.name}</TileName>
                {active && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-brand-fg ring-2 ring-surface">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              onCreateNew();
              onClose();
            }}
            className={cn(TILE, "border-dashed border-border/40")}
          >
            <span className="flex h-11 w-11 items-center justify-center">
              <Plus className="h-7 w-7 text-fg" />
            </span>
            <TileName>New</TileName>
          </button>
        </div>
        {matches.length === 0 && (
          <p className="mt-4 text-center text-body-sm text-muted">No category matches &ldquo;{query.trim()}&rdquo;.</p>
        )}
      </div>
    </>
  );
}

function TileName({ children }: { children: React.ReactNode }) {
  return (
    <span className="line-clamp-2 w-full text-[10.5px] font-bold leading-tight tracking-tighter text-fg [overflow-wrap:anywhere]">
      {children}
    </span>
  );
}
