"use client";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { AnchoredPopover, isInsidePopover } from "./anchored-popover";

export interface SelectMenuOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/**
 * Drop-in replacement for a native <select> that needs to look like the rest
 * of the app. A native select's closed box can be styled, but once opened,
 * its option list is rendered by the OS/browser chrome — on macOS that's a
 * dark, rounded, blue-highlight popup with zero relation to baaki's
 * sharp-edged cream/coral theme, and no CSS can reach it. This renders both
 * the trigger and the option list ourselves, in the same anchored-dropdown
 * style as MonthYearPicker/DatePicker. The option list floats above the app
 * (see AnchoredPopover), so it's never clipped and never pushes a form around.
 */
export function SelectMenu({
  id,
  value,
  onChange,
  options,
  placeholder = "Select…",
  invalid,
  disabled,
  size = "md",
  ariaLabel,
  className,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectMenuOption[];
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
  /** "sm" for a compact trigger (e.g. a card-header dropdown); "md" (default) matches Input's sizing. */
  size?: "sm" | "md";
  /** For a trigger with no associated <label htmlFor> (e.g. a bare card-header select). */
  ariaLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!isInsidePopover(e.target, panelRef.current, wrapperRef.current)) setOpen(false);
    };
    // Captured, and stopped here: Escape (or Android's Back) closes just this
    // popup, not the form or sheet it sits in.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <button
        type="button"
        id={id}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-none border bg-surface text-left transition-colors focus:outline-none focus:ring-2 focus:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-60",
          size === "sm" ? "px-3 py-1.5 text-label-md uppercase" : "px-4 py-3 text-[16px] sm:text-body-md",
          invalid ? "border-expense focus:border-expense" : "border-border focus:border-brand",
          selected ? "text-fg" : "text-faint",
        )}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted" />
      </button>

      {/* Exactly the trigger's width: long labels wrap instead of widening it. */}
      <AnchoredPopover ref={panelRef} open={open} role="listbox" maxHeight={256}>
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                disabled={opt.disabled}
                aria-selected={isSelected}
                aria-disabled={opt.disabled}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-start gap-2 border-b border-border-faint px-4 py-2.5 text-left text-sm transition-colors last:border-b-0",
                  isSelected ? "bg-brand-soft font-medium text-brand-hover" : "text-fg hover:bg-surface-2",
                  opt.disabled && "cursor-not-allowed text-faint opacity-50 hover:bg-transparent",
                )}
              >
                <Check className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", isSelected ? "opacity-100" : "opacity-0")} />
                <span>{opt.label}</span>
              </button>
            );
          })}
      </AnchoredPopover>
    </div>
  );
}
