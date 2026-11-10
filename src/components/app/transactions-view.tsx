"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import useSWRInfinite from "swr/infinite";
import { Filter, Search, Trash2, X } from "lucide-react";
import { SectionIcon } from "./section-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import { Money } from "@/components/money";
import { useConfirm } from "@/components/ui/confirm";
import { useToast } from "@/components/ui/toast";
import { TransactionRow } from "./transaction-row";
import { Sheet } from "./sheet";
import { TransactionFiltersSheet, TypePills } from "./transaction-filters-sheet";
import { useAppData } from "./app-data";
import { ApiError, apiPost, swrFetcher } from "@/lib/http";
import { toPaise } from "@/lib/money";
import { fromISODate, formatDate, monthLabel } from "@/lib/dates";
import type { MonthTotals, TransactionDTO } from "@/lib/types";
import { categoryKindMatches, EMPTY_FILTERS, matchingPreset, wholeMonth, type TransactionFilters } from "@/lib/transaction-filters";
import { cn } from "@/lib/cn";

const PAGE_SIZE = 50;

type TransactionsResponse = {
  transactions: TransactionDTO[];
  total: number;
  totals?: { income: number; expense: number };
  /** Only on the first page: they cover every matching row. */
  months?: MonthTotals;
};

export function TransactionsView({
  initialData,
  selectMode,
  onSelectModeChange,
}: {
  initialData?: TransactionsResponse;
  selectMode: boolean;
  onSelectModeChange: (on: boolean) => void;
}) {
  const { categories, accounts } = useAppData();
  const confirm = useConfirm();
  const toast = useToast();
  // The Accounts page links here with one account already chosen.
  const [filters, setFilters] = useState<TransactionFilters>(() => {
    const accountId = new URLSearchParams(window.location.search).get("accountId");
    return accountId ? { ...EMPTY_FILTERS, accountId } : EMPTY_FILTERS;
  });
  const [debouncedQ, setDebouncedQ] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  // Stable, or the sheet re-focuses its first control on every keystroke.
  const closeFilters = useCallback(() => setShowFilters(false), []);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(filters.q), 300);
    return () => clearTimeout(t);
  }, [filters.q]);

  // A selection belongs to the list it was made in: a new search or filter
  // starts afresh, so "Delete" can never reach rows that are no longer shown.
  const queryKey = JSON.stringify([debouncedQ, { ...filters, q: "" }]);
  useEffect(() => setSelectedIds(new Set()), [queryKey, selectMode]);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (debouncedQ) p.set("q", debouncedQ);
    if (filters.type) p.set("type", filters.type);
    if (filters.categoryId) p.set("categoryId", filters.categoryId);
    if (filters.accountId) p.set("accountId", filters.accountId);
    if (filters.start) p.set("start", filters.start);
    if (filters.end) p.set("end", filters.end);
    if (filters.tag) p.set("tag", filters.tag);
    if (filters.hasNotes) p.set("hasNotes", "1");
    if (filters.recurring) p.set("recurring", "1");
    try {
      if (filters.min) p.set("min", String(toPaise(filters.min)));
      if (filters.max) p.set("max", String(toPaise(filters.max)));
    } catch {
      /* ignore malformed amount */
    }
    return p.toString();
  }, [debouncedQ, filters]);

  const isDefaultQuery = !debouncedQ && Object.entries(filters).every(([key, value]) => key === "q" || !value);

  // Pages of PAGE_SIZE rows, fetched with skip/take so a long history can be
  // read all the way back (the API caps one request at 500 rows). Changing
  // the filters changes the first page's key, which starts over at page one.
  const getKey = (index: number, previous: TransactionsResponse | null) => {
    if (previous && previous.transactions.length < PAGE_SIZE) return null; // the last page was short
    const p = new URLSearchParams(query);
    p.set("take", String(PAGE_SIZE));
    p.set("skip", String(index * PAGE_SIZE));
    return `/api/transactions?${p.toString()}`;
  };
  const { data: pages, error, isLoading, isValidating, size, setSize, mutate } = useSWRInfinite<TransactionsResponse>(
    getKey,
    swrFetcher,
    {
      fallbackData: isDefaultQuery && initialData ? [initialData] : undefined,
      keepPreviousData: true,
      revalidateOnFocus: true,
    },
  );
  const data = pages?.[0];
  const loadingMore = isValidating && !!pages && pages.length < size;

  const txns = useMemo(() => {
    const seen = new Set<string>();
    return (pages ?? []).flatMap((pg) => pg.transactions).filter((t) => !seen.has(t.id) && !!seen.add(t.id));
  }, [pages]);
  const total = data?.total ?? 0;
  // Server-computed over every row matching the filter, not just the loaded
  // pages — see the comment in the API route.
  const totals = data?.totals ?? { income: 0, expense: 0 };

  const months = useMemo(() => groupByMonth(groupByDay(txns)), [txns]);
  const monthTotals = data?.months ?? {};

  const activeChips = buildChips(filters, { categories, accounts });
  function setType(type: string) {
    setFilters((f) => {
      const cat = categories.find((c) => c.id === f.categoryId);
      // Switching to a type the current category doesn't fit (e.g. an expense
      // category while Type is now Income) — clear it rather than silently
      // keep filtering on a mismatched pair.
      const stillFits = !cat || categoryKindMatches(cat.kind, type);
      return { ...f, type, categoryId: stillFits ? f.categoryId : "" };
    });
  }
  const set = (patch: Partial<TransactionFilters>) => setFilters((f) => ({ ...f, ...patch }));
  const clearFilters = () => setFilters((f) => ({ ...EMPTY_FILTERS, q: f.q }));

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allSelected = txns.length > 0 && txns.every((t) => selectedIds.has(t.id));
  function toggleSelectAll() {
    setSelectedIds(allSelected ? new Set() : new Set(txns.map((t) => t.id)));
  }

  async function onBulkDelete() {
    const count = selectedIds.size;
    if (count === 0) return;
    const ok = await confirm({
      title: `Delete ${count} transaction${count === 1 ? "" : "s"}?`,
      message: "This can't be undone from here.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      const res = await apiPost<{ count: number }>("/api/transactions/bulk-delete", { ids: [...selectedIds] });
      toast.success(`${res.count} transaction${res.count === 1 ? "" : "s"} deleted`);
      onSelectModeChange(false);
      mutate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not delete the selected transactions");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 divide-x divide-border rounded-lg border border-border bg-brand-soft/60 py-2.5">
        <SummaryCell label={total === 1 ? "Transaction" : "Transactions"}>
          <span className="tnum text-fg">{total.toLocaleString("en-IN")}</span>
        </SummaryCell>
        <SummaryCell label="Income"><SummaryMoney paise={totals.income} tone="income" /></SummaryCell>
        <SummaryCell label="Expenses"><SummaryMoney paise={totals.expense} tone="expense" /></SummaryCell>
      </div>

      {/* Search + filters */}
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input value={filters.q} onChange={(e) => set({ q: e.target.value })} placeholder="Search transactions…" aria-label="Search transactions" className="!h-10 !rounded-lg !py-0 !pr-2 pl-9 !text-[13px] md:!text-sm" />
        </div>
        <button
          type="button"
          onClick={() => setShowFilters(true)}
          aria-haspopup="dialog"
          aria-expanded={showFilters}
          aria-label={activeChips.length ? `Filters, ${activeChips.length} on` : "Filters"}
          className="relative flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-[13px] font-bold text-fg transition-colors hover:bg-surface-2 md:text-sm"
        >
          <Filter className="h-4 w-4" />
          Filters
          {activeChips.length > 0 && <span aria-hidden className="absolute right-1 top-1 h-2 w-2 rounded-full bg-brand-hover" />}
        </button>
      </div>

      <Sheet open={showFilters} onClose={closeFilters} title="Filters" bare>
        <TransactionFiltersSheet filters={filters} count={total} onChange={set} onTypeChange={setType} onClose={closeFilters} />
      </Sheet>

      {/* Type */}
      <TypePills value={filters.type} onChange={setType} />

      {/* Bulk selection toolbar */}
      {selectMode && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface-2 px-4 py-2.5 text-sm animate-fade-in">
          <label className="flex items-center gap-2 text-muted">
            <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="h-4 w-4 accent-brand" />
            Select all
          </label>
          <span className="text-muted">{selectedIds.size} selected</span>
          <div className="ml-auto flex gap-2">
            <Button variant="danger" size="sm" disabled={selectedIds.size === 0} loading={deleting} onClick={onBulkDelete}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* Active chips */}
      {activeChips.length > 0 && (
        <div className="flex items-start gap-3">
          <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
            {activeChips.map((chip) => (
              <button key={chip.label} type="button" onClick={() => set(chip.clear)} aria-label={`Remove filter: ${chip.label}`} className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-fg">
                <span className="truncate">{chip.label}</span>
                <X className="h-3 w-3 shrink-0" />
              </button>
            ))}
          </div>
          <button type="button" onClick={clearFilters} className="shrink-0 py-1 text-xs font-medium text-brand-hover">Clear all</button>
        </div>
      )}

      {/* Results */}
      {isLoading && !data ? (
        <div className="space-y-2 rounded-lg border border-border bg-surface p-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : error && !data ? (
        <div className="rounded-lg border border-border bg-surface">
          <EmptyState
            icon={<Search className="h-5 w-5" />}
            title="Couldn't load transactions"
            description={error instanceof Error ? error.message : "Something went wrong. Please try again."}
            action={<Button variant="secondary" onClick={() => mutate()}>Retry</Button>}
          />
        </div>
      ) : txns.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface">
          <EmptyState
            {...(!isDefaultQuery
              ? { icon: <Search className="h-5 w-5" /> }
              : { illustration: <SectionIcon section="transactions" size={56} /> })}
            title="No transactions found" description={!isDefaultQuery ? "Try adjusting or clearing your filters." : "Add your first transaction with the + button."} />
        </div>
      ) : (
        <div className="space-y-4">
          {months.map((month) => (
            <section key={month.key} className="space-y-2.5 md:space-y-3">
              <div className="flex items-baseline justify-between gap-3 px-0.5">
                <h2 className="text-label-lg uppercase tracking-[0.06em] text-fg">{month.label}</h2>
                <div className="flex gap-3 text-[13px] font-medium">
                  {(monthTotals[month.key]?.income ?? 0) > 0 && <Money paise={monthTotals[month.key].income} tone="income" sign />}
                  {(monthTotals[month.key]?.expense ?? 0) > 0 && <Money paise={-monthTotals[month.key].expense} tone="expense" />}
                </div>
              </div>
              {month.days.map((group) => (
                // The border is a layer over the card, not around it: the header's tint runs
                // underneath, so no pale fringe shows where the two curve together.
                <div key={group.date} className="relative rounded-lg bg-surface after:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:border after:border-border">
                  <div className={cn("flex items-center justify-between rounded-t-lg border-b border-border px-3.5 py-1 md:px-4 md:py-2", group.net > 0 ? "bg-brand-soft/60" : "bg-surface-2")}>
                    <span className="text-xs font-medium text-fg">{formatDate(fromISODate(group.date)!)}</span>
                    <Money paise={-group.net} tone={group.net > 0 ? "expense" : group.net < 0 ? "income" : "muted"} sign className="text-xs font-semibold" />
                  </div>
                  <div className="divide-y divide-border-faint px-1.5 md:px-2 md:py-0.5">
                    {group.items.map((t) => (
                      <TransactionRow
                        key={t.id}
                        txn={t}
                        showDate={false}
                        onChanged={() => mutate()}
                        selectMode={selectMode}
                        selected={selectedIds.has(t.id)}
                        onToggleSelect={toggleSelect}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </section>
          ))}
          {total > txns.length && (
            <div className="flex justify-center">
              <Button variant="secondary" loading={loadingMore} onClick={() => setSize(size + 1)}>Load more</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** One figure in the summary card, over its label; shrinks to fit a narrow phone. */
function SummaryCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 px-3 [container-type:inline-size] md:px-5">
      <p className="truncate whitespace-nowrap text-[clamp(0.8rem,16cqi,1.5rem)] font-bold leading-tight tracking-tight">{children}</p>
      <p className="mt-0.5 truncate text-[10px] uppercase leading-4 tracking-[0.04em] text-muted md:text-label-sm">{label}</p>
    </div>
  );
}

/** Whole rupees, and ₹1.2Cr-style from a crore up, where the full figure can't fit. */
function SummaryMoney({ paise, tone }: { paise: number; tone: "income" | "expense" }) {
  return <Money paise={paise} tone={tone} decimals="never" compact={paise >= 1_000_000_000} />;
}

interface DayGroup { date: string; items: TransactionDTO[]; net: number }
function groupByDay(txns: TransactionDTO[]): DayGroup[] {
  const map = new Map<string, DayGroup>();
  for (const t of txns) {
    let g = map.get(t.date);
    if (!g) { g = { date: t.date, items: [], net: 0 }; map.set(t.date, g); }
    g.items.push(t);
    if (t.type === "expense") g.net += t.amount;
    else if (t.type === "income") g.net -= t.amount;
  }
  return [...map.values()];
}

interface MonthGroup { key: string; label: string; days: DayGroup[] }
/** Days are newest first, so a month's days are always next to each other. */
function groupByMonth(days: DayGroup[]): MonthGroup[] {
  const months: MonthGroup[] = [];
  for (const day of days) {
    const key = day.date.slice(0, 7);
    let month = months[months.length - 1];
    if (month?.key !== key) {
      const [year, m] = key.split("-").map(Number);
      month = { key, label: monthLabel({ year, month: m }, { short: true }), days: [] };
      months.push(month);
    }
    month.days.push(day);
  }
  return months;
}

function buildChips(filters: TransactionFilters, lookups: { categories: { id: string; name: string }[]; accounts: { id: string; name: string }[] }) {
  const chips: { label: string; clear: Partial<TransactionFilters> }[] = [];
  if (filters.categoryId) chips.push({ label: lookups.categories.find((c) => c.id === filters.categoryId)?.name ?? "Category", clear: { categoryId: "" } });
  if (filters.accountId) chips.push({ label: lookups.accounts.find((a) => a.id === filters.accountId)?.name ?? "Account", clear: { accountId: "" } });
  if (filters.tag) chips.push({ label: `#${filters.tag}`, clear: { tag: "" } });
  const preset = matchingPreset(filters, new Date());
  const month = wholeMonth(filters);
  if (preset) {
    chips.push({ label: preset.label, clear: { start: "", end: "" } });
  } else if (month) {
    chips.push({ label: monthLabel(month), clear: { start: "", end: "" } });
  } else {
    if (filters.start) chips.push({ label: `From ${filters.start}`, clear: { start: "" } });
    if (filters.end) chips.push({ label: `To ${filters.end}`, clear: { end: "" } });
  }
  if (filters.min) chips.push({ label: `≥ ₹${filters.min}`, clear: { min: "" } });
  if (filters.max) chips.push({ label: `≤ ₹${filters.max}`, clear: { max: "" } });
  if (filters.hasNotes) chips.push({ label: "With notes", clear: { hasNotes: "" } });
  if (filters.recurring) chips.push({ label: "Recurring", clear: { recurring: "" } });
  return chips;
}
