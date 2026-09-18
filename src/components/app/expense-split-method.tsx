"use client";
import React from "react";
import { cn } from "@/lib/cn";
import type { ExpenseSplitMethod } from "@/lib/expense-split";

const METHODS: { value: ExpenseSplitMethod; label: string; hint: string }[] = [
  { value: "equal", label: "Split evenly", hint: "Everyone, including you, pays an equal share. Any leftover paise are distributed one at a time." },
  { value: "amounts", label: "Split by amounts", hint: "Enter each person's exact amount. The remaining amount is your share." },
  { value: "shares", label: "Split by shares", hint: "Use relative weights, such as 1:2:1. Two shares pay twice as much as one. You can use up to two decimal places." },
  { value: "percent", label: "Split by percentages", hint: "Enter each person's percentage. The remaining percentage is yours, so the total is always 100%." },
];

export function ExpenseSplitMethodPicker({
  value,
  onChange,
}: {
  value: ExpenseSplitMethod;
  onChange: (value: ExpenseSplitMethod) => void;
}) {
  return (
    <fieldset className="min-w-0 space-y-2">
      <legend className="text-label-md uppercase text-muted">Split method</legend>
      <div className="grid grid-cols-2 gap-2">
        {METHODS.map((method) => (
          <button
            key={method.value}
            type="button"
            aria-pressed={value === method.value}
            onClick={() => onChange(method.value)}
            className={cn(
              "min-h-10 border px-3 py-2 text-left text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
              value === method.value ? "border-brand bg-brand-soft text-brand-hover" : "border-border text-muted hover:bg-surface-2",
            )}
          >
            {method.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-faint">{METHODS.find((method) => method.value === value)?.hint}</p>
    </fieldset>
  );
}
