"use client";
import { ArrowDownRight, ArrowLeftRight, ArrowUpRight, ChevronRight } from "lucide-react";
import { formatDate, fromISODate } from "@/lib/dates";
import { type Frequency } from "@/lib/constants";
import type { RecurringDTO } from "@/lib/types";
import { cn } from "@/lib/ui/cn";

export type RecurringType = RecurringDTO["type"];
export type Picker = "category" | "account" | "toAccount" | "start" | "end" | null;

export const TYPE_OPTIONS: { value: RecurringType; label: string; icon: React.ElementType }[] = [
  { value: "expense", label: "Expense", icon: ArrowDownRight },
  { value: "income", label: "Income", icon: ArrowUpRight },
  { value: "transfer", label: "Transfer", icon: ArrowLeftRight },
];

/** The everyday schedules get a chip each; Custom opens up every unit. */
export const QUICK_FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "weekly", label: "Weekly" },
  { value: "yearly", label: "Yearly" },
];
export const isQuick = (f: Frequency) => QUICK_FREQUENCIES.some((q) => q.value === f);

export const UNITS: Record<Frequency, [one: string, many: string]> = {
  daily: ["day", "days"],
  weekly: ["week", "weeks"],
  monthly: ["month", "months"],
  quarterly: ["quarter", "quarters"],
  yearly: ["year", "years"],
};

export const MAX_INTERVAL = 365;
// No fill of their own: they sit on the same colour, and on the emulator's software
// renderer, filled rounded cards here made the WebView draw ghost copies of the form.
export const CARD = "rounded-xl border";
export const VALUE = "text-body-sm";
export const CHIP = "h-10 min-w-0 rounded-lg border text-[13px] font-bold transition-colors";

export function Required() {
  return <span aria-hidden className="ml-0.5 text-expense">*</span>;
}

export function dateLabel(iso: string): string {
  const date = fromISODate(iso);
  return date ? formatDate(date) : iso;
}

export function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-xs text-expense">{message}</p> : null;
}

/** A choice made on a sheet: its label and current value, opening the sheet on tap. */
export function PickerRow({
  icon,
  label,
  value,
  placeholder,
  required,
  error,
  onClick,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <button
        type="button"
        onClick={onClick}
        className={cn(CARD, "flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors active:bg-surface-2", error ? "border-expense" : "border-border")}
      >
        <span className="flex w-8 shrink-0 justify-center text-fg">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-fg">
            {label}
            {required && <Required />}
          </span>
          <span className={cn("block truncate", VALUE, value ? "text-fg" : "text-muted")}>{value ?? placeholder}</span>
        </span>
        <ChevronRight aria-hidden className="h-5 w-5 shrink-0 text-fg" />
      </button>
      <FieldError message={error} />
    </div>
  );
}
