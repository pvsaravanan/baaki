"use client";
import { useCallback, useState } from "react";
import { CalendarDays } from "lucide-react";
import { INPUT_BASE } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { formatDate, fromISODate } from "@/lib/dates";
import { DatePickerSheet } from "./date-picker-sheet";

/** A form field holding a date (YYYY-MM-DD, or "" when empty) that opens the date sheet. */
export function DateInput({
  id,
  label,
  value,
  onChange,
  min,
  max,
  optional,
  invalid,
  placeholder = "Select date",
  subtitle,
  className,
}: {
  id?: string;
  /** Names the field for screen readers. */
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  optional?: boolean;
  invalid?: boolean;
  placeholder?: string;
  subtitle?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const parsed = value ? fromISODate(value) : null;
  const shown = parsed ? formatDate(parsed) : null;

  return (
    <>
      <button
        id={id}
        type="button"
        aria-label={`${label}: ${shown ?? "not set"}`}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={cn(
          INPUT_BASE,
          "flex items-center justify-between gap-2 text-left",
          invalid ? "border-expense focus:border-expense" : "border-border focus:border-brand",
          className,
        )}
      >
        <span className={cn("truncate", !shown && "text-faint")}>{shown ?? placeholder}</span>
        <CalendarDays className="h-4 w-4 shrink-0 text-muted" />
      </button>
      <DatePickerSheet open={open} date={value} min={min} max={max} optional={optional} subtitle={subtitle} onClose={close} onPick={onChange} />
    </>
  );
}
