"use client";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  CalendarDays,
  CalendarRange,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  FileText,
  IndianRupee,
  Repeat,
  SlidersHorizontal,
  Tag,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { CategoryIcon } from "./category-icon";
import { AccountIcon } from "./accounts/account-icon";
import { useAppData } from "./app-data";
import { DateInput } from "./date-input";
import {
  advancedFilterCount,
  categoryKindMatches,
  datePresets,
  EMPTY_FILTERS,
  hasCustomDates,
  matchingPreset,
  monthDates,
  visibleWithSelected,
  wholeMonth,
  type TransactionFilters,
} from "@/lib/transaction-filters";
import { monthKeyOf, monthLabel } from "@/lib/dates";
import { MonthYearPicker } from "./month-year-picker";
import { cn } from "@/lib/cn";

const CATEGORY_LIMIT = 8;
const ACCOUNT_LIMIT = 3;

const TYPE_PILLS: { value: string; label: string; icon?: LucideIcon }[] = [
  { value: "", label: "All" },
  { value: "income", label: "Income", icon: ArrowUpRight },
  { value: "expense", label: "Expense", icon: ArrowDownRight },
  { value: "transfer", label: "Transfer", icon: ArrowLeftRight },
];

/** All / Income / Expense / Transfer: on the page, and again in the sheet. */
export function TypePills({ value, onChange }: { value: string; onChange: (type: string) => void }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-0.5 pr-0.5 [scrollbar-width:none] md:gap-2">
      {TYPE_PILLS.map(({ value: type, label, icon: Icon }) => {
        const active = value === type;
        return (
          <button
            key={label}
            type="button"
            onClick={() => onChange(type)}
            aria-pressed={active}
            className={cn(
              "flex h-10 items-center justify-center gap-1 rounded-full border border-border px-2 text-[12px] font-medium leading-4 text-fg transition-colors md:flex-none md:px-3 md:text-sm",
              type ? "flex-1" : "shrink-0 px-3",
              active ? "bg-brand font-bold text-brand-fg shadow-stamp-sm" : "bg-surface hover:bg-surface-2",
            )}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {label}
          </button>
        );
      })}
    </div>
  );
}

type Screen = "main" | "advanced" | "tags";

/**
 * The inside of the Filters sheet. Every choice applies to the list straight
 * away, which is how the button at the bottom can always say how many
 * transactions match; it only closes the sheet.
 */
export function TransactionFiltersSheet({
  filters,
  count,
  onChange,
  onTypeChange,
  onClose,
}: {
  filters: TransactionFilters;
  /** How many transactions match right now. */
  count: number;
  onChange: (patch: Partial<TransactionFilters>) => void;
  onTypeChange: (type: string) => void;
  onClose: () => void;
}) {
  const [screen, setScreen] = useState<Screen>("main");

  // Back (Escape, and Android's Back button) steps out of a sub-screen before
  // it closes the sheet: this runs ahead of the sheet's own listener.
  useEffect(() => {
    if (screen === "main") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      setScreen(screen === "tags" ? "advanced" : "main");
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [screen]);

  const resetAdvanced = () => {
    const { min, max, tag, hasNotes, recurring } = EMPTY_FILTERS;
    onChange({ min, max, tag, hasNotes, recurring, ...(hasCustomDates(filters, new Date()) ? { start: "", end: "" } : {}) });
  };
  const resetAll = () => onChange({ ...EMPTY_FILTERS, q: filters.q });

  return (
    <>
      <header className="flex items-center gap-3 border-b border-border px-4 pb-3 pt-1">
        {screen !== "main" && (
          <button type="button" onClick={() => setScreen(screen === "tags" ? "advanced" : "main")} aria-label="Back" className="-ml-1 p-1 text-fg">
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <h2 className="min-w-0 flex-1 truncate text-[20px] font-bold leading-7 tracking-tight text-fg">
          {screen === "main" ? "Filters" : screen === "advanced" ? "Advanced filters" : "Tags"}
        </h2>
        {screen !== "tags" && (
          <button type="button" onClick={screen === "main" ? resetAll : resetAdvanced} className="shrink-0 text-[13px] font-semibold text-brand-hover">
            Reset
          </button>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
        {screen === "main" && (
          <MainScreen filters={filters} onChange={onChange} onTypeChange={onTypeChange} onAdvanced={() => setScreen("advanced")} />
        )}
        {screen === "advanced" && <AdvancedScreen filters={filters} onChange={onChange} onTags={() => setScreen("tags")} />}
        {screen === "tags" && (
          <TagsScreen
            value={filters.tag}
            onChange={(tag) => {
              onChange({ tag });
              setScreen("advanced");
            }}
          />
        )}
      </div>

      <footer className="border-t border-border px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
        <Button size="lg" onClick={onClose} className="w-full !rounded-lg">
          Show {count.toLocaleString("en-IN")} {count === 1 ? "transaction" : "transactions"}
        </Button>
      </footer>
    </>
  );
}

function MainScreen({
  filters,
  onChange,
  onTypeChange,
  onAdvanced,
}: {
  filters: TransactionFilters;
  onChange: (patch: Partial<TransactionFilters>) => void;
  onTypeChange: (type: string) => void;
  onAdvanced: () => void;
}) {
  const { categories, accounts } = useAppData();
  const [allCategories, setAllCategories] = useState(false);
  const [allAccounts, setAllAccounts] = useState(false);

  const now = useMemo(() => new Date(), []);
  const presets = useMemo(() => datePresets(now), [now]);
  const activePreset = matchingPreset(filters, now);
  const advancedCount = advancedFilterCount(filters, now);

  // Categories on offer follow the selected type, same as the add/edit form.
  const eligible = useMemo(() => categories.filter((c) => categoryKindMatches(c.kind, filters.type)), [categories, filters.type]);
  const shownCategories = allCategories ? eligible : visibleWithSelected(eligible, CATEGORY_LIMIT, filters.categoryId);
  const shownAccounts = allAccounts ? accounts : visibleWithSelected(accounts, ACCOUNT_LIMIT, filters.accountId);

  return (
    <div className="space-y-4">
      <Section title="Transaction type">
        <TypePills value={filters.type} onChange={onTypeChange} />
      </Section>

      <Section title="Date range">
        <div className="grid grid-cols-2 gap-2">
          {presets.map((preset) => {
            const active = activePreset?.label === preset.label;
            return (
              <button
                key={preset.label}
                type="button"
                aria-pressed={active}
                onClick={() => onChange(active ? { start: "", end: "" } : { start: preset.start, end: preset.end })}
                className={cn(
                  "flex h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border px-2 text-[13px] font-medium leading-4 text-fg transition-colors",
                  active ? "border-brand-hover bg-brand-soft" : "border-border bg-surface hover:bg-surface-2",
                )}
              >
                {active && <Calendar className="h-4 w-4 shrink-0" />}
                {preset.label}
              </button>
            );
          })}
        </div>
        <MonthFilter filters={filters} onChange={onChange} />
      </Section>

      {eligible.length > 0 && (
        <Section
          title="Category"
          action={eligible.length > CATEGORY_LIMIT && <ViewAll expanded={allCategories} onToggle={() => setAllCategories((v) => !v)} />}
        >
          <div className="grid grid-cols-4 gap-1">
            {shownCategories.map((c) => (
              <Tile
                key={c.id}
                selected={filters.categoryId === c.id}
                onClick={() => onChange({ categoryId: filters.categoryId === c.id ? "" : c.id })}
                className="min-h-[68px] flex-col justify-center gap-1 py-1.5"
              >
                <span style={{ color: c.color }}><CategoryIcon icon={c.icon} size={28} /></span>
                <span className="line-clamp-2 w-full break-words text-center text-[10px] font-medium leading-3 tracking-tight text-fg">{c.name}</span>
              </Tile>
            ))}
          </div>
        </Section>
      )}

      {accounts.length > 0 && (
        <Section
          title="Accounts"
          action={accounts.length > ACCOUNT_LIMIT && <ViewAll expanded={allAccounts} onToggle={() => setAllAccounts((v) => !v)} />}
        >
          <div className="grid grid-cols-3 gap-1.5">
            {shownAccounts.map((a) => (
              <Tile
                key={a.id}
                selected={filters.accountId === a.id}
                onClick={() => onChange({ accountId: filters.accountId === a.id ? "" : a.id })}
                className="min-h-11 gap-1.5 px-1.5 py-1"
              >
                <AccountIcon account={a} size={22} />
                <span className="line-clamp-2 min-w-0 break-words text-left text-[10.5px] font-medium leading-[13px] tracking-tight text-fg">{a.name}</span>
              </Tile>
            ))}
          </div>
        </Section>
      )}

      <button type="button" onClick={onAdvanced} className="flex w-full items-center gap-3 border-t border-border-faint pt-3 text-left text-fg">
        <SlidersHorizontal className="h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1 text-[13px] font-medium">Advanced filters</span>
        {advancedCount > 0 && <span className="text-xs font-bold text-brand-hover">{advancedCount} on</span>}
        <ChevronDown className="h-4 w-4 shrink-0" />
      </button>
    </div>
  );
}

function AdvancedScreen({
  filters,
  onChange,
  onTags,
}: {
  filters: TransactionFilters;
  onChange: (patch: Partial<TransactionFilters>) => void;
  onTags: () => void;
}) {
  const { tags } = useAppData();
  const [amountOpen, setAmountOpen] = useState(true);
  // Open when a range is already set, closed for one of the presets.
  const [datesOpen, setDatesOpen] = useState(() => hasCustomDates(filters, new Date()));
  const rupees = (raw: string) => raw.replace(/[^0-9.]/g, "");

  return (
    <div className="divide-y divide-border-faint">
      <Collapsible icon={IndianRupee} title="Amount range" open={amountOpen} onToggle={() => setAmountOpen((v) => !v)}>
        <div className="flex items-center gap-2">
          <AmountInput label="Min amount" placeholder="Min" value={filters.min} onChange={(min) => onChange({ min: rupees(min) })} />
          <span className="shrink-0 text-muted">–</span>
          <AmountInput label="Max amount" placeholder="Max" value={filters.max} onChange={(max) => onChange({ max: rupees(max) })} />
        </div>
      </Collapsible>

      <Collapsible icon={CalendarRange} title="Custom dates" open={datesOpen} onToggle={() => setDatesOpen((v) => !v)}>
        <div className="flex items-center gap-2">
          <DateInput label="From date" placeholder="From" optional value={filters.start} onChange={(start) => onChange({ start })} subtitle="Show transactions from this date." className="!h-10 min-w-0 flex-1 !rounded-lg !px-3 !py-0 !text-body-sm" />
          <span className="shrink-0 text-muted">–</span>
          <DateInput label="To date" placeholder="To" optional value={filters.end} onChange={(end) => onChange({ end })} subtitle="Show transactions up to this date." className="!h-10 min-w-0 flex-1 !rounded-lg !px-3 !py-0 !text-body-sm" />
        </div>
      </Collapsible>

      <ToggleRow icon={FileText} label="With notes" checked={!!filters.hasNotes} onChange={(on) => onChange({ hasNotes: on ? "1" : "" })} />
      <ToggleRow icon={Repeat} label="Recurring transactions only" checked={!!filters.recurring} onChange={(on) => onChange({ recurring: on ? "1" : "" })} />

      {tags.length > 0 && (
        <button type="button" onClick={onTags} className="flex min-h-12 w-full items-center gap-3 py-2 text-left text-fg">
          <Tag className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-[13px] font-medium">Tags</span>
          <span className="min-w-0 truncate text-xs text-muted">{filters.tag || "Select a tag…"}</span>
          <ChevronRight className="h-4 w-4 shrink-0" />
        </button>
      )}
    </div>
  );
}

function TagsScreen({ value, onChange }: { value: string; onChange: (tag: string) => void }) {
  const { tags } = useAppData();
  return (
    <div className="divide-y divide-border-faint">
      {[{ name: "", label: "Any tag" }, ...tags.map((t) => ({ name: t.name, label: `#${t.name}` }))].map(({ name, label }) => (
        <button key={label} type="button" aria-pressed={value === name} onClick={() => onChange(name)} className="flex min-h-11 w-full items-center gap-3 py-2 text-left text-[13px] font-medium text-fg">
          <span className="min-w-0 flex-1 truncate">{label}</span>
          {value === name && <Check className="h-4 w-4 shrink-0 text-brand-hover" />}
        </button>
      ))}
    </div>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[13px] font-semibold text-fg">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function ViewAll({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} aria-expanded={expanded} className="flex items-center gap-1 text-[11px] font-medium text-brand-hover">
      {expanded ? "Show less" : "View all"}
      {!expanded && <ArrowRight className="h-3 w-3" />}
    </button>
  );
}

/** A category or account to pick, with a tick in its corner once picked. */
function Tile({ selected, onClick, className, children }: { selected: boolean; onClick: () => void; className?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "relative flex min-w-0 items-center rounded-lg border transition-colors",
        selected ? "border-brand-hover bg-brand-soft" : "border-border bg-surface hover:bg-surface-2",
        className,
      )}
    >
      {children}
      {selected && (
        <span aria-hidden className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-brand-hover text-brand-fg">
          <Check className="h-2.5 w-2.5" strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

function Collapsible({
  icon: Icon,
  title,
  open,
  onToggle,
  children,
}: {
  icon: LucideIcon;
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="py-2">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex min-h-8 w-full items-center gap-3 text-left text-fg">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-[13px] font-medium">{title}</span>
        {open ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
      </button>
      {open && <div className="pb-1 pl-7 pt-2">{children}</div>}
    </div>
  );
}

function AmountInput({ label, placeholder, value, onChange }: { label: string; placeholder: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="relative min-w-0 flex-1">
      <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted">₹</span>
      <Input inputMode="decimal" aria-label={label} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} className="!h-10 !rounded-lg !py-0 pl-7 !text-[13px]" />
    </div>
  );
}

function ToggleRow({ icon: Icon, label, checked, onChange }: { icon: LucideIcon; label: string; checked: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center gap-3 py-2 text-fg">
      <Icon className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1 text-[13px] font-medium">{label}</span>
      <Switch checked={checked} onChange={onChange} label={label} />
    </label>
  );
}

/** One whole month of your choosing: a month picker, then that month. */
function MonthFilter({ filters, onChange }: { filters: TransactionFilters; onChange: (patch: Partial<TransactionFilters>) => void }) {
  const [open, setOpen] = useState(false);
  const now = useMemo(() => new Date(), []);
  const month = matchingPreset(filters, now) ? null : wholeMonth(filters);
  return (
    <div className="relative mt-2">
      <button
        type="button"
        aria-pressed={!!month}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-10 w-full items-center justify-center gap-1.5 rounded-full border px-3 text-[13px] font-medium leading-4 text-fg transition-colors",
          month ? "border-brand-hover bg-brand-soft" : "border-border bg-surface hover:bg-surface-2",
        )}
      >
        <CalendarDays className="h-4 w-4 shrink-0" />
        {month ? monthLabel(month) : "Choose a month"}
      </button>
      <MonthYearPicker
        open={open}
        onClose={() => setOpen(false)}
        value={month}
        maxMonth={monthKeyOf(now)}
        title="Choose a month"
        onClear={month ? () => onChange({ start: "", end: "" }) : undefined}
        onSelect={(key) => {
          setOpen(false);
          onChange(monthDates(key));
        }}
      />
    </div>
  );
}
