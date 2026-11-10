"use client";
import { useEffect, useRef, useState } from "react";
import { CalendarDays, CalendarRange, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addMonths, monthKeyOf, monthLabel, type MonthKey } from "@/lib/dates";
import {
  chosenMonths,
  MAX_RANGE_MONTHS,
  monthPeriod,
  periodLabel,
  rangePeriod,
  type ReportPeriod,
} from "@/lib/report-period";
import { MonthYearPicker } from "../month-year-picker";
import { Sheet } from "../sheet";
import { chipClass } from "./chip-row";

const order = (k: MonthKey) => k.year * 12 + k.month;

/** Brings a chip into view once it's the choice (it may sit off the row's edge). */
function useShowWhenChosen(chosen: string | null) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (chosen) ref.current?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [chosen]);
  return ref;
}

/** The chip for one chosen month: "Pick month", then the month itself. */
export function MonthChip({ period, onPick }: { period: ReportPeriod; onPick: (period: ReportPeriod) => void }) {
  const [open, setOpen] = useState(false);
  const chosen = chosenMonths(period);
  const month = chosen && order(chosen.from) === order(chosen.to) ? chosen.from : null;
  const ref = useShowWhenChosen(month ? period : null);
  return (
    <span className="relative shrink-0">
      <button ref={ref} type="button" aria-pressed={!!month} aria-haspopup="dialog" onClick={() => setOpen((o) => !o)} className={chipClass(!!month)}>
        <CalendarDays aria-hidden className="h-4 w-4 shrink-0" />
        {month ? periodLabel(period) : "Pick month"}
      </button>
      <MonthYearPicker
        open={open}
        onClose={() => setOpen(false)}
        value={month}
        maxMonth={monthKeyOf(new Date())}
        title="Choose a month"
        width={300}
        onSelect={(key) => {
          setOpen(false);
          onPick(monthPeriod(key));
        }}
      />
    </span>
  );
}

/** The chip for a span of months: "Custom", then the span ("Jan – Jun 2026"). */
export function RangeChip({ period, onPick }: { period: ReportPeriod; onPick: (period: ReportPeriod) => void }) {
  const [open, setOpen] = useState(false);
  const chosen = chosenMonths(period);
  const span = chosen && order(chosen.from) !== order(chosen.to) ? chosen : null;
  const ref = useShowWhenChosen(span ? period : null);
  return (
    <>
      <button ref={ref} type="button" aria-pressed={!!span} aria-haspopup="dialog" onClick={() => setOpen(true)} className={chipClass(!!span)}>
        <CalendarRange aria-hidden className="h-4 w-4 shrink-0" />
        {span ? periodLabel(period) : "Custom"}
      </button>
      {open && (
        <RangeSheet
          initial={span}
          onClose={() => setOpen(false)}
          onApply={(from, to) => {
            setOpen(false);
            onPick(rangePeriod(from, to));
          }}
        />
      )}
    </>
  );
}

/** From one month to another: two month pickers and Apply. */
function RangeSheet({
  initial,
  onClose,
  onApply,
}: {
  initial: { from: MonthKey; to: MonthKey } | null;
  onClose: () => void;
  onApply: (from: MonthKey, to: MonthKey) => void;
}) {
  const current = monthKeyOf(new Date());
  const [from, setFrom] = useState<MonthKey>(initial?.from ?? addMonths(current, -2));
  const [to, setTo] = useState<MonthKey>(initial?.to ?? current);
  const [picking, setPicking] = useState<"from" | "to" | null>(null);

  const count = order(to) - order(from) + 1;
  const problem =
    count < 1 ? "The end can't be before the start." : count > MAX_RANGE_MONTHS ? `Choose up to ${MAX_RANGE_MONTHS} months.` : null;

  return (
    <Sheet open onClose={onClose} title="Custom period">
      <p className="-mt-1 mb-3 text-body-sm text-muted">See your reports for any span of months.</p>
      <div className="flex items-end gap-2">
        <MonthField
          label="From"
          value={from}
          open={picking === "from"}
          onToggle={() => setPicking((p) => (p === "from" ? null : "from"))}
          onClose={() => setPicking(null)}
          maxMonth={current}
          onSelect={setFrom}
        />
        <span className="shrink-0 pb-3 text-muted">–</span>
        <MonthField
          label="To"
          value={to}
          open={picking === "to"}
          onToggle={() => setPicking((p) => (p === "to" ? null : "to"))}
          onClose={() => setPicking(null)}
          minMonth={from}
          maxMonth={current}
          onSelect={setTo}
        />
      </div>
      <p role={problem ? "alert" : undefined} className={problem ? "mt-2 text-body-sm text-expense" : "mt-2 text-body-sm text-muted"}>
        {problem ?? `${count} ${count === 1 ? "month" : "months"}`}
      </p>
      <Button size="lg" disabled={!!problem} onClick={() => onApply(from, to)} className="mt-4 w-full !rounded-lg">
        Show this period
      </Button>
    </Sheet>
  );
}

function MonthField({
  label,
  value,
  open,
  onToggle,
  onClose,
  minMonth,
  maxMonth,
  onSelect,
}: {
  label: string;
  value: MonthKey;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  minMonth?: MonthKey;
  maxMonth: MonthKey;
  onSelect: (key: MonthKey) => void;
}) {
  return (
    <div className="min-w-0 flex-1">
      <span className="mb-1 block text-label-md uppercase text-muted">{label}</span>
      <span className="relative block">
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={onToggle}
          className="flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-border/30 bg-surface px-3 text-body-sm font-bold text-fg"
        >
          {monthLabel(value, { short: true })}
          <ChevronDown aria-hidden className="h-4 w-4 shrink-0" />
        </button>
        <MonthYearPicker
          open={open}
          onClose={onClose}
          value={value}
          minMonth={minMonth}
          maxMonth={maxMonth}
          title={`${label} month`}
          width={300}
          onSelect={(key) => {
            onClose();
            onSelect(key);
          }}
        />
      </span>
    </div>
  );
}
