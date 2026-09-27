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
          : "inline-flex max-w-full items-center overflow-x-auto rounded-none border border-border bg-surface",
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
              "inline-flex items-center justify-center gap-1.5 rounded-none uppercase transition-colors min-h-[38px] touch-manipulation",
              wrap ? "border border-border" : "shrink-0 whitespace-nowrap",
              !wrap && i > 0 && "border-l border-border",
              size === "sm" ? "px-2.5 py-1.5 text-label-sm" : "px-3.5 py-2 text-label-md",
              active ? "bg-brand text-brand-fg font-semibold" : "text-muted hover:bg-brand-soft hover:text-secondary",
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
