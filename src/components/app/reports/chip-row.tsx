"use client";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

/** A pill, as ChipRow draws them (for a chip of your own after its options). */
export function chipClass(active: boolean) {
  return cn(
    "inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-[13px] font-bold transition-colors",
    active ? "border-border bg-brand text-brand-fg" : "border-border/30 bg-surface text-fg",
  );
}

/**
 * A row of choices as pills. Scrolls sideways on a narrow phone, running to the
 * screen's edges. `children` are more pills after the options (choices that
 * open a picker); `value` is null when one of those is the choice.
 */
export function ChipRow<T extends string>({
  label,
  options,
  value,
  onChange,
  children,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  children?: React.ReactNode;
}) {
  // The chosen chip may be off to the side.
  const activeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [value]);

  return (
    <div role="group" aria-label={label} className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
      {options.map((option) => (
        <button
          key={option.value}
          ref={option.value === value ? activeRef : undefined}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={chipClass(option.value === value)}
        >
          {option.label}
        </button>
      ))}
      {children}
    </div>
  );
}
