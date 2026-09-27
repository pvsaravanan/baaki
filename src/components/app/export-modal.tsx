"use client";
import { useState } from "react";
import { Download } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { SelectMenu } from "@/components/ui/select-menu";
import { useToast } from "@/components/ui/toast";
import { useAppData } from "./app-data";
import { downloadFile } from "@/lib/http";
import { toPaise } from "@/lib/money";
import {
  TRANSACTION_TYPES,
  TYPE_LABELS,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
} from "@/lib/constants";

export interface ExportFilters {
  type: string;
  categoryId: string;
  accountId: string;
  paymentMethod: string;
  tag: string;
  start: string;
  end: string;
  min: string;
  max: string;
  q: string;
}

const EMPTY: ExportFilters = {
  type: "",
  categoryId: "",
  accountId: "",
  paymentMethod: "",
  tag: "",
  start: "",
  end: "",
  min: "",
  max: "",
  q: "",
};

function buildExportUrl(filters: ExportFilters): string {
  const p = new URLSearchParams();
  p.set("format", "csv");
  if (filters.type) p.set("type", filters.type);
  if (filters.categoryId) p.set("categoryId", filters.categoryId);
  if (filters.accountId) p.set("accountId", filters.accountId);
  if (filters.paymentMethod) p.set("paymentMethod", filters.paymentMethod);
  if (filters.tag) p.set("tag", filters.tag);
  if (filters.start) p.set("start", filters.start);
  if (filters.end) p.set("end", filters.end);
  if (filters.q) p.set("q", filters.q);
  try {
    if (filters.min) p.set("min", String(toPaise(filters.min)));
    if (filters.max) p.set("max", String(toPaise(filters.max)));
  } catch {
    /* ignore malformed amount */
  }
  return `/api/export?${p.toString()}`;
}

function hasAnyFilter(f: ExportFilters): boolean {
  return !!(f.type || f.categoryId || f.accountId || f.paymentMethod || f.tag || f.start || f.end || f.min || f.max || f.q);
}

export function ExportModal({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  /** Pre-fill from the active page filters. */
  initial?: Partial<ExportFilters>;
}) {
  const { categories, accounts, tags } = useAppData();
  const toast = useToast();
  const [filters, setFilters] = useState<ExportFilters>(() => ({ ...EMPTY, ...initial }));
  const [downloading, setDownloading] = useState(false);

  // Reset when re-opened with different initial filters.
  const [lastOpen, setLastOpen] = useState(false);
  if (open && !lastOpen) {
    setFilters({ ...EMPTY, ...initial });
  }
  if (open !== lastOpen) setLastOpen(open);

  const set = (patch: Partial<ExportFilters>) => setFilters((f) => ({ ...f, ...patch }));

  async function handleDownload() {
    setDownloading(true);
    const ok = await downloadFile(buildExportUrl(filters), (message) => toast.error(message));
    setDownloading(false);
    if (ok) onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Export transactions" description="Choose filters to narrow the export, or download everything." size="lg">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <FilterField label="From date">
            <Input type="date" value={filters.start} onChange={(e) => set({ start: e.target.value })} />
          </FilterField>
          <FilterField label="To date">
            <Input type="date" value={filters.end} onChange={(e) => set({ end: e.target.value })} />
          </FilterField>
          <FilterField label="Type">
            <SelectMenu
              value={filters.type}
              onChange={(v) => set({ type: v })}
              options={[{ value: "", label: "All types" }, ...TRANSACTION_TYPES.map((t) => ({ value: t, label: TYPE_LABELS[t] }))]}
            />
          </FilterField>
          <FilterField label="Category">
            <SelectMenu
              value={filters.categoryId}
              onChange={(v) => set({ categoryId: v })}
              options={[{ value: "", label: "All categories" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
            />
          </FilterField>
          <FilterField label="Account">
            <SelectMenu
              value={filters.accountId}
              onChange={(v) => set({ accountId: v })}
              options={[{ value: "", label: "All accounts" }, ...accounts.map((a) => ({ value: a.id, label: a.name }))]}
            />
          </FilterField>
          <FilterField label="Payment method">
            <SelectMenu
              value={filters.paymentMethod}
              onChange={(v) => set({ paymentMethod: v })}
              options={[{ value: "", label: "Any method" }, ...PAYMENT_METHODS.map((m) => ({ value: m, label: PAYMENT_METHOD_LABELS[m] }))]}
            />
          </FilterField>
          {tags.length > 0 && (
            <FilterField label="Tag">
              <SelectMenu
                value={filters.tag}
                onChange={(v) => set({ tag: v })}
                options={[{ value: "", label: "Any tag" }, ...tags.map((t) => ({ value: t.name, label: t.name }))]}
              />
            </FilterField>
          )}
          <FilterField label="Search text">
            <Input value={filters.q} onChange={(e) => set({ q: e.target.value })} placeholder="Description, notes, merchant…" />
          </FilterField>
          <FilterField label="Min amount (₹)">
            <Input inputMode="decimal" value={filters.min} onChange={(e) => set({ min: e.target.value.replace(/[^0-9.]/g, "") })} placeholder="0" />
          </FilterField>
          <FilterField label="Max amount (₹)">
            <Input inputMode="decimal" value={filters.max} onChange={(e) => set({ max: e.target.value.replace(/[^0-9.]/g, "") })} placeholder="Any" />
          </FilterField>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
          {hasAnyFilter(filters) && (
            <Button variant="ghost" onClick={() => setFilters(EMPTY)}>
              Clear filters
            </Button>
          )}
          <div className="flex-1" />
          <Button onClick={handleDownload} loading={downloading}>
            <Download className="h-4 w-4" />
            {hasAnyFilter(filters) ? "Download filtered CSV" : "Download all CSV"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-muted">{label}</label>
      {children}
    </div>
  );
}
