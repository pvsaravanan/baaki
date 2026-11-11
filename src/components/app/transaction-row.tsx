"use client";
import { useState } from "react";
import { Icon } from "@/components/icon";
import { CategoryIcon } from "@/components/app/category-icon";
import { Money } from "@/components/money";
import { useAppData, useLookups } from "./app-data";
import { useTransactionModal } from "./add-transaction";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import { SwipeActions } from "@/components/ui/swipe-actions";
import { apiDelete, apiPost } from "@/lib/http";
import { fromISODate, formatRelativeDay } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import type { TransactionDTO } from "@/lib/types";
import { cn } from "@/lib/cn";

const TONE: Record<string, "income" | "expense" | "muted" | "default"> = {
  income: "income",
  expense: "expense",
  transfer: "muted",
};

export function TransactionRow({
  txn,
  showDate = true,
  swipeActions = true,
  compact = false,
  onChanged,
  selectMode = false,
  selected = false,
  onToggleSelect,
}: {
  txn: TransactionDTO;
  showDate?: boolean;
  /** Swipe left for Edit and Delete; the dashboard leaves it out. */
  swipeActions?: boolean;
  /** A tighter row (smaller icon and padding) for places short on room. */
  compact?: boolean;
  onChanged?: () => void;
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}) {
  const { refresh } = useAppData();
  const { category, accountName } = useLookups();
  const { openEdit } = useTransactionModal();
  const toast = useToast();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);

  const cat = txn.categoryId ? category(txn.categoryId) : null;
  const isTransfer = txn.type === "transfer";
  // Expenses reduce the balance; income and transfers both display as a
  // positive amount (the tone/sign props below distinguish them visually).
  const signed = txn.type === "expense" ? -txn.amount : txn.amount;

  const done = () => {
    refresh();
    onChanged?.();
  };

  async function onDelete() {
    const ok = await confirm({
      title: "Delete this transaction?",
      message: "You can undo this right after.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await apiDelete(`/api/transactions/${txn.id}`);
      done();
      toast.success("Transaction deleted", {
        label: "Undo",
        onClick: async () => {
          await apiPost(`/api/transactions/${txn.id}/restore`).catch(() => {});
          done();
        },
      });
    } catch {
      toast.error("Could not delete the transaction");
      setBusy(false);
    }
  }

  const meta = [
    isTransfer ? `${accountName(txn.accountId)} → ${accountName(txn.transferAccountId)}` : cat?.name ?? "Uncategorized",
    !isTransfer ? accountName(txn.accountId) : null,
  ].filter(Boolean);

  const badgeColor = isTransfer
    ? "#64748b"
    : cat?.color ?? (txn.type === "income" ? "#2c6b4f" : "#64748b");

  // Transfers keep a plain ⇆ symbol (money moving between your own accounts);
  // everything else shows an illustration — its category's, or one for its
  // type when it has no category.
  const fallbackIcon = txn.type === "income" ? "dollars" : "more";

  const openOrToggle = () => {
    if (selectMode) onToggleSelect?.(txn.id);
    else openEdit(txn);
  };

  return (
    <SwipeActions
      name={txn.description}
      enabled={swipeActions && !selectMode}
      onEdit={() => openEdit(txn)}
      onDelete={onDelete}
      contentClassName={cn(
        "group flex items-center gap-3 px-2 hover:bg-surface-2",
        compact ? "py-1" : "py-2 md:py-2.5",
        busy && "opacity-50",
      )}
    >
      {selectMode && (
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect?.(txn.id)}
          className="h-4 w-4 shrink-0 accent-brand"
          aria-label={selected ? "Deselect transaction" : "Select transaction"}
        />
      )}

      <button
        onClick={openOrToggle}
        className={cn("flex shrink-0 items-center justify-center rounded-none", compact ? "h-8 w-8" : "h-9 w-9")}
        style={{ color: badgeColor }}
        aria-label="Edit transaction"
      >
        {!isTransfer ? (
          <CategoryIcon icon={cat?.icon ?? fallbackIcon} size={compact ? 26 : 30} />
        ) : (
          <Icon name="arrow-left-right" size={20} strokeWidth={2.2} />
        )}
      </button>

      <button onClick={openOrToggle} className="min-w-0 flex-1 text-left">
        <div className="flex items-center gap-2">
          <p className={cn("min-w-0 truncate font-medium text-fg", compact ? "text-[13px] leading-[18px]" : "text-[13px] font-semibold leading-[18px] md:text-sm")}>{txn.description}</p>
          {txn.recurringId && (
            <span className="shrink-0 rounded bg-brand-soft px-1.5 py-0.5 text-2xs font-medium text-brand-hover">auto</span>
          )}
          {txn.splits.length > 0 && (
            <span className="shrink-0 rounded bg-surface-2 px-1.5 py-0.5 text-2xs font-medium text-muted">
              split · yours {formatINR(Math.max(0, txn.amount - txn.splits.reduce((sum, s) => sum + s.amount, 0)))}
            </span>
          )}
        </div>
        <p className={cn("truncate text-muted", compact ? "text-[11px] leading-[14px]" : "text-[11px] leading-4 md:text-xs")}>
          {meta.join(" · ")}
          {txn.tags.length > 0 && <span className="text-faint"> · {txn.tags.map((t) => `#${t}`).join(" ")}</span>}
        </p>
      </button>

      <div className="flex shrink-0 flex-col items-end">
        <Money paise={signed} tone={TONE[txn.type]} sign={txn.type !== "expense" && txn.type !== "transfer"} className={cn("font-semibold", compact ? "text-[13px]" : "text-[13px] md:text-sm")} />
        {showDate && <span className="text-2xs text-faint">{formatRelativeDay(fromISODate(txn.date) ?? new Date(), new Date())}</span>}
      </div>
    </SwipeActions>
  );
}
