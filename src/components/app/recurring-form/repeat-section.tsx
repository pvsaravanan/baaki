"use client";
import { CalendarDays, ChevronRight, Minus, Plus, RefreshCw } from "lucide-react";
import { SelectMenu } from "@/components/ui/select-menu";
import { FREQUENCIES, type Frequency } from "@/lib/constants";
import { cn } from "@/lib/ui/cn";
import { Required, FieldError, CARD, CHIP, VALUE, QUICK_FREQUENCIES, UNITS, MAX_INTERVAL, dateLabel } from "./parts";

export function RepeatSection({
  custom,
  onCustom,
  frequency,
  onFrequency,
  interval,
  onInterval,
  intervalNum,
  error,
  startDate,
  onPickStart,
}: {
  custom: boolean;
  onCustom: (custom: boolean) => void;
  frequency: Frequency;
  onFrequency: (frequency: Frequency) => void;
  interval: string;
  onInterval: (interval: string) => void;
  /** `interval` as a whole number (0 when it isn't one yet). */
  intervalNum: number;
  error?: string;
  startDate: string;
  onPickStart: () => void;
}) {
  return (
    <section className={cn(CARD, "space-y-3 border-border p-3")}>
      <h3 className="flex items-center gap-2.5 text-base font-bold text-fg">
        <span className="flex w-8 shrink-0 justify-center">
          <RefreshCw aria-hidden className="h-6 w-6" />
        </span>
        Repeat
      </h3>

      <div>
        <p className="mb-1.5 text-body-sm text-fg">Frequency</p>
        <div role="radiogroup" aria-label="Frequency" className="grid grid-cols-4 gap-1.5">
          {QUICK_FREQUENCIES.map(({ value, label }) => {
            const active = !custom && frequency === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  onCustom(false);
                  onFrequency(value);
                }}
                className={cn(CHIP, active ? "border-border bg-brand text-brand-fg" : "border-border/30 text-fg")}
              >
                {label}
              </button>
            );
          })}
          <button
            type="button"
            role="radio"
            aria-checked={custom}
            onClick={() => onCustom(true)}
            className={cn(CHIP, custom ? "border-border bg-brand text-brand-fg" : "border-border/30 text-fg")}
          >
            Custom
          </button>
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {/* With the unit menu there's no room for all three on one line of a phone. */}
          <span id="repeat-every" className={cn("text-body-sm text-fg", custom && "w-full sm:w-auto")}>Repeat every</span>
          <div className={cn("flex h-11 items-center rounded-lg border", error ? "border-expense" : "border-border")}>
            <button
              type="button"
              onClick={() => onInterval(String(Math.max(1, intervalNum - 1)))}
              disabled={intervalNum <= 1}
              aria-label="Decrease"
              className="flex h-full w-9 items-center justify-center text-fg disabled:text-faint"
            >
              <Minus className="h-4 w-4" />
            </button>
            <input
              inputMode="numeric"
              value={interval}
              onChange={(e) => onInterval(e.target.value.replace(/\D/g, "").slice(0, 3))}
              onBlur={() => onInterval(String(Math.min(MAX_INTERVAL, Math.max(1, intervalNum))))}
              aria-labelledby="repeat-every"
              className="tnum w-9 bg-transparent text-center text-[16px] text-fg focus:outline-none"
            />
            <button
              type="button"
              onClick={() => onInterval(String(Math.min(MAX_INTERVAL, intervalNum + 1)))}
              disabled={intervalNum >= MAX_INTERVAL}
              aria-label="Increase"
              className="flex h-full w-9 items-center justify-center text-fg disabled:text-faint"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {custom ? (
            <SelectMenu
              soft
              ariaLabel="Repeat unit"
              value={frequency}
              onChange={(v) => onFrequency(v as Frequency)}
              options={FREQUENCIES.map((f) => ({ value: f, label: UNITS[f][intervalNum === 1 ? 0 : 1] }))}
              className="w-32"
            />
          ) : (
            <span className="text-body-sm text-fg">{UNITS[frequency][intervalNum === 1 ? 0 : 1]}</span>
          )}
        </div>
        <FieldError message={error} />
      </div>

      <button
        type="button"
        onClick={onPickStart}
        className="flex w-full items-center gap-2.5 border-t border-border/15 pt-3 text-left"
      >
        <span className="flex w-8 shrink-0 justify-center text-fg">
          <CalendarDays aria-hidden className="h-6 w-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-fg">
            Start date
            <Required />
          </span>
          <span className={cn("block text-fg", VALUE)}>{dateLabel(startDate)}</span>
        </span>
        <ChevronRight aria-hidden className="h-5 w-5 shrink-0 text-fg" />
      </button>
    </section>
  );
}
