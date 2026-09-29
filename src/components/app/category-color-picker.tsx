"use client";
import { Check } from "lucide-react";
import { CATEGORY_COLORS, categoryColorName } from "@/lib/category-colors";
import { cn } from "@/lib/cn";

/**
 * Pick a category's colour from the palette. A colour saved before the
 * palette existed stays selectable as "Current" so opening the form doesn't
 * silently change it.
 */
export function CategoryColorPicker({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const current = value.toLowerCase();
  const inPalette = CATEGORY_COLORS.some((c) => c.hex === current);
  const options = inPalette ? CATEGORY_COLORS : [{ hex: current, name: "Current" }, ...CATEGORY_COLORS];
  return (
    <div>
      <div role="radiogroup" aria-label="Category colour" className="grid grid-cols-10 gap-1.5">
        {options.map((c) => {
          const selected = c.hex === current;
          return (
            <button
              key={c.hex}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={c.name}
              title={c.name}
              onClick={() => onChange(c.hex)}
              className={cn(
                "flex aspect-square items-center justify-center border transition-[transform,box-shadow] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                selected
                  ? "border-fg shadow-stamp-sm"
                  : "border-border/40 hover:-translate-x-px hover:-translate-y-px hover:border-border hover:shadow-stamp-sm",
              )}
              style={{ backgroundColor: c.hex }}
            >
              {selected && <Check className="h-4 w-4 text-white drop-shadow" strokeWidth={3} aria-hidden />}
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-xs text-muted">{inPalette ? categoryColorName(current) : "Current colour"}</p>
    </div>
  );
}
