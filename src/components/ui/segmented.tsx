"use client";
import React from "react";
import { cn } from "@/lib/cn";

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = "md",
  wrap = false,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon?: React.ReactNode }[];
  size?: "sm" | "md";
  /**
   * Lay tabs out as a wrapping grid of individually-bordered cells instead
   * of one shared strip that scrolls sideways — for a tablist with too many
   * options to fit on one line without an uneasy, half-cut-off scroll. The
   * caller supplies the column count via `className` (e.g. "grid-cols-3").
   */
  wrap?: boolean;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        wrap
          ? "grid gap-1.5"
          : "inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-border/20 bg-surface-2/60 p-1",
        className,
      )}
    >
      {options.map((opt, i) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            // Roving tabindex + arrow keys, per the tablist ARIA contract the
            // role="tab" markup implies.
            tabIndex={active ? 0 : -1}
            onKeyDown={(e) => {
              if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
              e.preventDefault();
              const delta = e.key === "ArrowRight" ? 1 : -1;
              const nextIndex = (i + delta + options.length) % options.length;
              onChange(options[nextIndex].value);
            }}
            onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-full transition-colors min-h-[38px] touch-manipulation",
              wrap ? "border border-border" : "shrink-0 whitespace-nowrap",
                            size === "sm" ? "px-3 py-1.5 text-[12px] font-bold" : "px-4 py-2 text-[13px] font-bold",
              active ? "bg-brand text-brand-fg" : "text-fg hover:bg-brand-soft/60",
            )}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
