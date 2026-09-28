"use client";
import { CATEGORY_ICON_KEYS, categoryIconLabel, resolveCategoryIcon } from "@/lib/category-icons";
import { CategoryIcon } from "./category-icon";
import { cn } from "@/lib/cn";

/** Scrollable grid of every illustrated icon; `value` may be a legacy line-icon name. */
export function CategoryIconPicker({
  value,
  onChange,
  label = "Category icon",
}: {
  value: string;
  onChange: (key: string) => void;
  /** Accessible name for the group (it's also used for goals and accounts). */
  label?: string;
}) {
  const selected = resolveCategoryIcon(value);
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid max-h-56 grid-cols-6 gap-1.5 overflow-y-auto border border-border bg-surface-2/30 p-1.5 sm:grid-cols-8"
    >
      {CATEGORY_ICON_KEYS.map((key) => {
        const active = key === selected;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={categoryIconLabel(key)}
            title={categoryIconLabel(key)}
            onClick={() => onChange(key)}
            className={cn(
              "flex aspect-square items-center justify-center rounded-none border bg-surface transition-colors active:scale-95",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
              active ? "border-brand bg-brand-soft ring-1 ring-brand" : "border-border hover:bg-brand-soft",
            )}
          >
            <CategoryIcon icon={key} size={26} />
          </button>
        );
      })}
    </div>
  );
}
