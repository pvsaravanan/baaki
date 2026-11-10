"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { EmptyState } from "@/components/ui/misc";
import { TransactionRow } from "@/components/app/transaction-row";
import type { TransactionDTO } from "@/lib/types";

/** Rows shown on a wide screen, where the card isn't squeezed into one phone screen. */
const WIDE_ROWS = 3;
const MIN_ROW_HEIGHT = 40;

/**
 * How many rows fit in the box a ref points at. The box takes whatever height
 * the rest of the dashboard leaves; this counts whole rows in it, measured
 * from the rows themselves, so none is ever cut off (0 when not even one fits).
 * From the `md` width up the card has no fixed height, so it shows the wide count.
 */
function useRowsThatFit(max: number, enabled: boolean) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState(Math.min(max, WIDE_ROWS));
  const isLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

  isLayoutEffect(() => {
    const box = boxRef.current;
    if (!box || !enabled) return;
    const measure = () => {
      if (window.matchMedia("(min-width: 768px)").matches) return setRows(Math.min(max, WIDE_ROWS));
      const first = box.firstElementChild as HTMLElement | null;
      const rowHeight = Math.max(first?.getBoundingClientRect().height ?? 0, MIN_ROW_HEIGHT);
      // The divider between rows is a hairline; allow for it.
      setRows(Math.max(0, Math.min(max, Math.floor((box.clientHeight + 1) / (rowHeight + 1)))));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, [max, enabled]);

  return { boxRef, rows: enabled ? rows : Math.min(max, WIDE_ROWS) };
}

/** The latest entries in a rounded card under their own heading; `fit` shows as many as the phone screen has room for. */
export function RecentTransactionsCard({ transactions, fit }: { transactions: TransactionDTO[]; fit: boolean }) {
  const { boxRef, rows } = useRowsThatFit(transactions.length, fit);
  return (
    // With no room for even one row on a very short phone, the section keeps its
    // place (so it can be measured again) but is not drawn.
    <section className={cn("flex min-h-0 flex-1 flex-col md:block", fit && transactions.length > 0 && rows === 0 && "invisible md:visible")}>
      <div className="mb-1.5 flex shrink-0 items-center justify-between gap-3 md:mb-3">
        <h3 className="text-label-md uppercase tracking-[0.06em] text-fg md:text-label-lg">Recent transactions</h3>
        <Link href="/transactions" className="flex shrink-0 items-center gap-1 text-label-sm uppercase text-brand-hover">
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-surface px-2 py-0.5 md:flex-none md:py-1">
        {transactions.length === 0 ? (
          <EmptyState title="No transactions yet" description="Add your first transaction to get started." />
        ) : (
          <div ref={boxRef} className="h-full divide-y divide-border-faint overflow-hidden md:h-auto">
            {transactions.slice(0, rows).map((t) => (
              <TransactionRow key={t.id} txn={t} showDate={false} swipeActions={false} compact />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
