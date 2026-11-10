"use client";
import { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clampDate, clampMonth, isoDate, leadingBlanks, monthKeyOfISO, moveToMonth, yearPageStart, type DateBounds } from "@/lib/date-picker";
import { cn } from "@/lib/cn";
import { addMonths, daysInMonth, formatDate, fromISODate, monthKeyString, monthLabel, monthName, toISODate, type MonthKey } from "@/lib/dates";
import { Sheet } from "./sheet";

type Tab = "date" | "month" | "year";

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const YEARS_PER_PAGE = 12;
// Keeps the arrows from wandering off into years nobody needs.
const EARLIEST_DATE = "1900-01-01";

/** Choosing a date. An empty `date` means none is set yet. */
export function DatePickerSheet({
  open,
  date,
  min,
  max,
  optional = false,
  subtitle = "Choose a date.",
  onClose,
  onPick,
}: {
  open: boolean;
  date: string;
  min?: string;
  max?: string;
  /** The field can be empty, so Clear removes its date. Otherwise Clear only deselects here. */
  optional?: boolean;
  subtitle?: string;
  onClose: () => void;
  onPick: (date: string) => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Select date" bare>
      {/* Mounted only while open, so each opening starts from the current value. */}
      <Picker
        title="Select Date"
        subtitle={subtitle}
        initial={date}
        bounds={{ min: min ?? EARLIEST_DATE, max }}
        optional={optional}
        onClose={onClose}
        onPickDate={onPick}
      />
    </Sheet>
  );
}

/** Choosing a whole month: tapping one picks it, as there's no day to set. */
export function MonthPickerSheet({
  open,
  value,
  min,
  max,
  onClose,
  onPick,
}: {
  open: boolean;
  value: MonthKey;
  min: MonthKey;
  max: MonthKey;
  onClose: () => void;
  onPick: (month: MonthKey) => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Select month" bare>
      <Picker
        title="Select Month"
        subtitle="Choose the month to view."
        initial={isoDate(value, 1)}
        bounds={{ min: isoDate(min, 1), max: isoDate(max, daysInMonth(max)) }}
        onClose={onClose}
        onPickMonth={onPick}
      />
    </Sheet>
  );
}

function Picker({
  title,
  subtitle,
  initial,
  bounds,
  optional = false,
  onClose,
  onPickDate,
  onPickMonth,
}: {
  title: string;
  subtitle: string;
  initial: string;
  bounds: DateBounds;
  optional?: boolean;
  onClose: () => void;
  onPickDate?: (date: string) => void;
  onPickMonth?: (month: MonthKey) => void;
}) {
  const monthOnly = !!onPickMonth;
  const today = toISODate(new Date());
  const inBounds = (iso: string) => clampDate(iso, bounds) === iso;

  const [tab, setTab] = useState<Tab>(monthOnly ? "month" : "date");
  // A saved date outside the limits (an end date now before the start) can't stay selected.
  const [selected, setSelected] = useState<string | null>(initial && inBounds(initial) ? initial : null);
  const [view, setView] = useState<MonthKey>(() => clampMonth(monthKeyOfISO(initial || today), bounds));
  const [yearStart, setYearStart] = useState(() => yearPageStart(view.year));

  const minMonth = bounds.min?.slice(0, 7);
  const maxMonth = bounds.max?.slice(0, 7);
  const minYear = bounds.min ? Number(bounds.min.slice(0, 4)) : -Infinity;
  const maxYear = bounds.max ? Number(bounds.max.slice(0, 4)) : Infinity;
  const viewMonth = monthKeyString(view);

  const showYears = () => {
    setYearStart(yearPageStart(view.year));
    setTab("year");
  };

  const pickMonth = (key: MonthKey) => {
    if (onPickMonth) {
      onPickMonth(key);
      onClose();
      return;
    }
    setView(key);
    setSelected((s) => s && moveToMonth(s, key, bounds));
    setTab("date");
  };

  const pickYear = (year: number) => {
    const key = clampMonth({ year, month: view.month }, bounds);
    setView(key);
    setSelected((s) => s && moveToMonth(s, key, bounds));
    setTab("month");
  };

  const clear = () => {
    if (optional) {
      onPickDate?.("");
      onClose();
    } else {
      setSelected(null);
    }
  };

  // What the arrows and the heading mean on each tab.
  const nav = {
    date: {
      title: monthLabel(view),
      onTitle: () => setTab("month"),
      prev: () => setView((v) => addMonths(v, -1)),
      next: () => setView((v) => addMonths(v, 1)),
      canPrev: !minMonth || viewMonth > minMonth,
      canNext: !maxMonth || viewMonth < maxMonth,
      unit: "month",
    },
    month: {
      title: String(view.year),
      onTitle: showYears,
      prev: () => setView((v) => clampMonth({ ...v, year: v.year - 1 }, bounds)),
      next: () => setView((v) => clampMonth({ ...v, year: v.year + 1 }, bounds)),
      canPrev: view.year > minYear,
      canNext: view.year < maxYear,
      unit: "year",
    },
    year: {
      title: `${yearStart} – ${yearStart + YEARS_PER_PAGE - 1}`,
      onTitle: undefined,
      prev: () => setYearStart((y) => y - YEARS_PER_PAGE),
      next: () => setYearStart((y) => y + YEARS_PER_PAGE),
      canPrev: yearStart > minYear,
      canNext: yearStart + YEARS_PER_PAGE <= maxYear,
      unit: "years",
    },
  }[tab];

  const tabs: { value: Tab; label: string }[] = [
    ...(monthOnly ? [] : [{ value: "date" as const, label: "Date" }]),
    { value: "month", label: "Month" },
    { value: "year", label: "Year" },
  ];

  return (
    <div className="overflow-y-auto overscroll-contain px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-4">
      <h2 className="text-headline-sm tracking-normal text-fg">{title}</h2>
      <p className="mt-0.5 text-body-sm text-muted">{subtitle}</p>

      <div role="tablist" aria-label="Choose by" className="mt-3 flex rounded-full border border-border/20 p-1">
        {tabs.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => (value === "year" ? showYears() : setTab(value))}
            className={cn(
              "h-10 flex-1 rounded-full text-body-sm font-bold transition-colors",
              tab === value ? "bg-brand text-brand-fg" : "text-fg",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <ArrowButton label={`Previous ${nav.unit}`} onClick={nav.prev} disabled={!nav.canPrev}>
          <ChevronLeft className="h-5 w-5" />
        </ArrowButton>
        {nav.onTitle ? (
          <button type="button" onClick={nav.onTitle} className="flex items-center gap-1.5 text-body-lg font-bold text-fg">
            {nav.title}
            <ChevronDown className="h-4 w-4" />
          </button>
        ) : (
          <span className="text-body-lg font-bold text-fg">{nav.title}</span>
        )}
        <ArrowButton label={`Next ${nav.unit}`} onClick={nav.next} disabled={!nav.canNext}>
          <ChevronRight className="h-5 w-5" />
        </ArrowButton>
      </div>

      {/* Tall enough for a six-week month, so the buttons below don't move around. */}
      <div className="mt-2 min-h-[296px]">
        {tab === "date" && <DaysGrid view={view} selected={selected} today={today} inBounds={inBounds} onPick={setSelected} />}
        {tab === "month" && (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 12 }, (_, i) => {
              const key = { year: view.year, month: i + 1 };
              const month = monthKeyString(key);
              return (
                <GridChoice
                  key={i}
                  active={selected?.slice(0, 7) === month}
                  disabled={(!!minMonth && month < minMonth) || (!!maxMonth && month > maxMonth)}
                  onClick={() => pickMonth(key)}
                >
                  {monthName(i + 1, true)}
                </GridChoice>
              );
            })}
          </div>
        )}
        {tab === "year" && (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: YEARS_PER_PAGE }, (_, i) => {
              const year = yearStart + i;
              return (
                <GridChoice key={year} active={year === view.year} disabled={year < minYear || year > maxYear} onClick={() => pickYear(year)}>
                  {year}
                </GridChoice>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        {!monthOnly && (
          <Button variant="outline" size="lg" onClick={clear} disabled={!selected} className="mr-auto !rounded-lg !px-4">
            Clear
          </Button>
        )}
        <Button variant="outline" size="lg" onClick={onClose} className="!rounded-lg !px-4">
          Cancel
        </Button>
        {!monthOnly && (
          <Button
            size="lg"
            disabled={!selected}
            onClick={() => {
              if (!selected) return;
              onPickDate?.(selected);
              onClose();
            }}
            className="!rounded-lg !px-4"
          >
            Set Date
          </Button>
        )}
      </div>
    </div>
  );
}

function DaysGrid({
  view,
  selected,
  today,
  inBounds,
  onPick,
}: {
  view: MonthKey;
  selected: string | null;
  today: string;
  inBounds: (date: string) => boolean;
  onPick: (date: string) => void;
}) {
  return (
    <>
      <div className="grid grid-cols-7 pb-1 text-center text-label-sm">
        {WEEKDAYS.map((d, i) => (
          <span key={d} className={i === 0 || i === 6 ? "text-brand-hover" : "text-muted"}>
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {Array.from({ length: leadingBlanks(view) }, (_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {Array.from({ length: daysInMonth(view) }, (_, i) => {
          const day = isoDate(view, i + 1);
          const active = day === selected;
          return (
            <button
              key={day}
              type="button"
              disabled={!inBounds(day)}
              aria-pressed={active}
              aria-label={formatDate(fromISODate(day)!)}
              onClick={() => onPick(day)}
              className={cn(
                "mx-auto flex h-11 w-11 items-center justify-center rounded-lg text-body-md font-medium disabled:text-faint",
                active ? "bg-brand font-bold text-brand-fg" : "text-fg",
                !active && day === today && "ring-1 ring-inset ring-brand",
              )}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </>
  );
}

function ArrowButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft/50 text-fg disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function GridChoice({ active, disabled, onClick, children }: { active: boolean; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "h-[64px] rounded-lg border text-body-md font-bold disabled:font-medium disabled:text-faint",
        active ? "border-brand bg-brand text-brand-fg" : "border-border/20 text-fg",
      )}
    >
      {children}
    </button>
  );
}
