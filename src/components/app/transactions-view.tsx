"use client";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { CheckSquare, Filter, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import { Money } from "@/components/money";
import { useConfirm } from "@/components/ui/confirm";
import { useToast } from "@/components/ui/toast";
import { TransactionRow } from "./transaction-row";
import { useAppData } from "./app-data";
import { apiPost, swrFetcher } from "@/lib/http";
import { toPaise } from "@/lib/money";
import { fromISODate, formatDate } from "@/lib/dates";
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  TRANSACTION_TYPES,
  TYPE_LABELS,
  formatPaymentMethod,
} from "@/lib/constants";
import type { TransactionDTO } from "@/lib/types";
import { cn } from "@/lib/cn";

interface Filters {
  q: string;
  type: string;
  categoryId: string;
  accountId: string;
  paymentMethod: string;
  start: string;
  end: string;
  min: string;
  max: string;
  tag: string;
}

const EMPTY: Filters = { q: "", type: "", categoryId: "", accountId: "", paymentMethod: "", start: "", end: "", min: "", max: "", tag: "" };

type TransactionsResponse = {
  transactions: TransactionDTO[];
  total: number;
  totals?: { income: number; expense: number };
};

export function TransactionsView({
  initialData,
}: {
  initialData?: TransactionsResponse;
} = {}) {
  const { categories, accounts, tags } = useAppData();
  const confirm = useConfirm();
  const toast = useToast();
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [debouncedQ, setDebouncedQ] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [take, setTake] = useState(50);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(filters.q), 300);
    return () => clearTimeout(t);
  }, [filters.q]);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (debouncedQ) p.set("q", debouncedQ);
    if (filters.type) p.set("type", filters.type);
    if (filters.categoryId) p.set("categoryId", filters.categoryId);
    if (filters.accountId) p.set("accountId", filters.accountId);
    if (filters.paymentMethod) p.set("paymentMethod", filters.paymentMethod);
    if (filters.start) p.set("start", filters.start);
    if (filters.end) p.set("end", filters.end);
    if (filters.tag) p.set("tag", filters.tag);
    try {
      if (filters.min) p.set("min", String(toPaise(filters.min)));
      if (filters.max) p.set("max", String(toPaise(filters.max)));
    } catch {
      /* ignore malformed amount */
    }
    p.set("take", String(take));
    return p.toString();
  }, [debouncedQ, filters, take]);

  const isDefaultQuery =
    !debouncedQ &&
    !filters.type &&
    !filters.categoryId &&
    !filters.accountId &&
    !filters.paymentMethod &&
    !filters.start &&
    !filters.end &&
    !filters.tag &&
    !filters.min &&
    !filters.max &&
    take === 50;

  const { data, error, isLoading, mutate } = useSWR<TransactionsResponse>(
    `/api/transactions?${query}`,
    swrFetcher,
    {
      fallbackData: isDefaultQuery ? initialData : undefined,
      keepPreviousData: true,
      revalidateOnFocus: true,
    },
  );

  // Sync SWR data if initialData updates from server refresh
  useEffect(() => {
    if (initialData && isDefaultQuery) {
      mutate(initialData, false);
    }
  }, [initialData, isDefaultQuery, mutate]);

  const txns = data?.transactions ?? [];
  const total = data?.total ?? 0;
  // Server-computed over every row matching the filter, not just this page —
  // see the comment in the API route.
  const totals = data?.totals ?? { income: 0, expense: 0 };

  const grouped = useMemo(() => groupByDay(txns), [txns]);

  // Categories on offer in the filter follow the selected transaction Type,
  // same as the add/edit form: transfers never carry a category, income
  // filters to income/both-kind categories, expense/refund to expense/both.
  const eligibleCategories = useMemo(
    () => categories.filter((c) => categoryKindMatches(c.kind, filters.type)),
    [categories, filters.type],
  );

  const activeChips = buildChips(filters, { categories, accounts });
  const set = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

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
      await apiPost("/api/transactions/bulk-delete", { ids: [...selectedIds] });
      toast.success(`${count} transaction${count === 1 ? "" : "s"} deleted`);
      exitSelectMode();
      mutate();
    } catch {
      toast.error("Could not delete the selected transactions");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Search + actions */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <Input value={filters.q} onChange={(e) => set({ q: e.target.value })} placeholder="Search description, notes, merchant…" className="pl-9" />
        </div>
        <Button variant={showFilters || activeChips.length ? "secondary" : "outline"} onClick={() => setShowFilters((s) => !s)}>
          <Filter className="h-4 w-4" />
          Filters
          {activeChips.length > 0 && <span className="ml-1 rounded-none bg-brand px-1.5 text-2xs text-brand-fg">{activeChips.length}</span>}
        </Button>
        <Button variant={selectMode ? "secondary" : "outline"} onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}>
          <CheckSquare className="h-4 w-4" />
          {selectMode ? "Cancel" : "Select"}
        </Button>
      </div>

      {/* Bulk selection toolbar */}
      {selectMode && (
        <div className="flex flex-wrap items-center gap-3 rounded-none border border-border bg-surface-2 px-4 py-2.5 text-sm animate-fade-in">
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

      {/* Filter panel */}
      <Modal
        open={showFilters}
        onClose={() => setShowFilters(false)}
        title="Filters"
        size="lg"
        footer={
          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" onClick={() => setFilters(EMPTY)}>Clear all</Button>
            <Button onClick={() => setShowFilters(false)}>Done</Button>
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <FilterField label="Type">
            <Select
              value={filters.type}
              onChange={(e) => {
                const type = e.target.value;
                setFilters((f) => {
                  const cat = categories.find((c) => c.id === f.categoryId);
                  // Switching to a type the current category doesn't fit (e.g.
                  // an expense category while Type is now Income) — clear it
                  // rather than silently keep filtering on a mismatched pair.
                  const stillFits = !cat || categoryKindMatches(cat.kind, type);
                  return { ...f, type, categoryId: stillFits ? f.categoryId : "" };
                });
              }}
            >
              <option value="">All types</option>
              {TRANSACTION_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
            </Select>
          </FilterField>
          <FilterField label="Category">
            <Select value={filters.categoryId} onChange={(e) => set({ categoryId: e.target.value })}>
              <option value="">All categories</option>
              {eligibleCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </FilterField>
          <FilterField label="Account">
            <Select value={filters.accountId} onChange={(e) => set({ accountId: e.target.value })}>
              <option value="">All accounts</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </FilterField>
          <FilterField label="Payment method">
            <Select value={filters.paymentMethod} onChange={(e) => set({ paymentMethod: e.target.value })}>
              <option value="">Any method</option>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>)}
            </Select>
          </FilterField>
          {tags.length > 0 && (
            <FilterField label="Tag" className="col-span-2">
              <Select value={filters.tag} onChange={(e) => set({ tag: e.target.value })}>
                <option value="">Any tag</option>
                {tags.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
              </Select>
            </FilterField>
          )}
          {/* Date and amount ranges share one labeled row each (two inputs
              side by side) instead of four separate label+field rows — the
              biggest win for vertical space on a phone-height sheet. */}
          <FilterField label="Date range" className="col-span-2">
            <div className="flex items-center gap-2">
              <Input type="date" aria-label="From date" value={filters.start} onChange={(e) => set({ start: e.target.value })} className="min-w-0 flex-1" />
              <span className="shrink-0 text-xs text-faint">to</span>
              <Input type="date" aria-label="To date" value={filters.end} onChange={(e) => set({ end: e.target.value })} className="min-w-0 flex-1" />
            </div>
          </FilterField>
          <FilterField label="Amount (₹)" className="col-span-2">
            <div className="flex items-center gap-2">
              <Input inputMode="decimal" aria-label="Min amount" value={filters.min} onChange={(e) => set({ min: e.target.value.replace(/[^0-9.]/g, "") })} placeholder="Min" className="min-w-0 flex-1" />
              <span className="shrink-0 text-xs text-faint">to</span>
              <Input inputMode="decimal" aria-label="Max amount" value={filters.max} onChange={(e) => set({ max: e.target.value.replace(/[^0-9.]/g, "") })} placeholder="Max" className="min-w-0 flex-1" />
            </div>
          </FilterField>
        </div>
      </Modal>

      {/* Active chips */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {activeChips.map((chip) => (
            <button key={chip.key} onClick={() => set({ [chip.key]: "" } as Partial<Filters>)} className="inline-flex items-center gap-1 rounded-none border border-border bg-surface-2 px-2.5 py-1 text-xs text-fg hover:bg-border/50">
              {chip.label}
              <X className="h-3 w-3 text-faint" />
            </button>
          ))}
        </div>
      )}

      {/* Summary */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-none border border-border bg-surface-2 px-4 py-2.5 text-sm">
        <span className="text-muted">{total} transaction{total === 1 ? "" : "s"}</span>
        <span className="flex items-center gap-1.5 text-muted">Income <Money paise={totals.income} tone="income" className="font-medium" /></span>
        <span className="flex items-center gap-1.5 text-muted">Expense <Money paise={totals.expense} tone="expense" className="font-medium" /></span>
      </div>

      {/* Results */}
      {isLoading && !data ? (
        <div className="space-y-2 rounded-none border border-border bg-surface p-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : error && !data ? (
        <div className="rounded-none border border-border bg-surface">
          <EmptyState
            icon={<Search className="h-5 w-5" />}
            title="Couldn't load transactions"
            description={error instanceof Error ? error.message : "Something went wrong. Please try again."}
            action={<Button variant="secondary" onClick={() => mutate()}>Retry</Button>}
          />
        </div>
      ) : txns.length === 0 ? (
        <div className="rounded-none border border-border bg-surface">
          <EmptyState icon={<Search className="h-5 w-5" />} title="No transactions found" description={activeChips.length ? "Try adjusting or clearing your filters." : "Add your first transaction with the + button."} />
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map((group) => (
            <div key={group.date} className="rounded-none border border-border bg-surface">
              <div className="flex items-center justify-between border-b border-border px-4 py-2">
                <span className="text-xs font-medium text-muted">{formatDate(fromISODate(group.date)!)}</span>
                <Money paise={-group.net} tone={group.net >= 0 ? "expense" : "income"} className="text-xs font-medium" />
              </div>
              <div className="divide-y divide-border px-2 py-1">
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
          {total > txns.length && (
            <div className="flex justify-center">
              <Button variant="secondary" onClick={() => setTake((t) => t + 50)}>Load more</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FilterField({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1", className)}>
      <label className="block text-xs font-medium text-muted">{label}</label>
      {children}
    </div>
  );
}

/** Whether a category's kind is a sensible filter option for a transaction type. */
function categoryKindMatches(kind: string, type: string): boolean {
  if (type === "transfer") return false; // transfers never carry a category
  if (type === "income") return kind === "income" || kind === "both";
  if (type === "expense" || type === "refund") return kind === "expense" || kind === "both";
  return true; // "" = all types — no restriction
}

interface DayGroup { date: string; items: TransactionDTO[]; net: number }
function groupByDay(txns: TransactionDTO[]): DayGroup[] {
  const map = new Map<string, DayGroup>();
  for (const t of txns) {
    let g = map.get(t.date);
    if (!g) { g = { date: t.date, items: [], net: 0 }; map.set(t.date, g); }
    g.items.push(t);
    if (t.type === "expense") g.net += t.amount;
    else if (t.type === "refund" || t.type === "income") g.net -= t.amount;
  }
  return [...map.values()];
}

function buildChips(filters: Filters, lookups: { categories: { id: string; name: string }[]; accounts: { id: string; name: string }[] }) {
  const chips: { key: keyof Filters; label: string }[] = [];
  if (filters.type) chips.push({ key: "type", label: TYPE_LABELS[filters.type as keyof typeof TYPE_LABELS] ?? filters.type });
  if (filters.categoryId) chips.push({ key: "categoryId", label: lookups.categories.find((c) => c.id === filters.categoryId)?.name ?? "Category" });
  if (filters.accountId) chips.push({ key: "accountId", label: lookups.accounts.find((a) => a.id === filters.accountId)?.name ?? "Account" });
  if (filters.paymentMethod) chips.push({ key: "paymentMethod", label: formatPaymentMethod(filters.paymentMethod) });
  if (filters.tag) chips.push({ key: "tag", label: `#${filters.tag}` });
  if (filters.start) chips.push({ key: "start", label: `From ${filters.start}` });
  if (filters.end) chips.push({ key: "end", label: `To ${filters.end}` });
  if (filters.min) chips.push({ key: "min", label: `≥ ₹${filters.min}` });
  if (filters.max) chips.push({ key: "max", label: `≤ ₹${filters.max}` });
  return chips;
}
