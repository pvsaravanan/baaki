"use client";
import { useState } from "react";
import { ArrowLeftRight, Copy, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Icon } from "@/components/icon";
import { CategoryIcon } from "@/components/app/category-icon";
import { Money } from "@/components/money";
import { useAppData, useLookups } from "./app-data";
import { useTransactionModal } from "./add-transaction";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import { apiDelete, apiPost } from "@/lib/http";
import { fromISODate, formatRelativeDay } from "@/lib/dates";
import { formatPaymentMethod } from "@/lib/constants";
import { ownAmountOf } from "@/lib/calculations";
import { formatINR } from "@/lib/money";
import type { TransactionDTO } from "@/lib/types";
import { cn } from "@/lib/cn";

const TONE: Record<string, "income" | "expense" | "muted" | "default"> = {
  income: "income",
  expense: "expense",
  transfer: "muted",
  repayment: "income",
};

export function TransactionRow({
  txn,
  showDate = true,
  onChanged,
  selectMode = false,
  selected = false,
  onToggleSelect,
}: {
  txn: TransactionDTO;
  showDate?: boolean;
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
  const [menuOpen, setMenuOpen] = useState(false);
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
    setMenuOpen(false);
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

  async function onDuplicate() {
    setMenuOpen(false);
    try {
      await apiPost(`/api/transactions/${txn.id}/duplicate`);
      done();
      toast.success("Transaction duplicated");
    } catch {
      toast.error("Could not duplicate the transaction");
    }
  }

  const meta = [
    isTransfer ? `${accountName(txn.accountId)} → ${accountName(txn.transferAccountId)}` : cat?.name ?? "Uncategorized",
    !isTransfer ? accountName(txn.accountId) : null,
    txn.paymentMethod ? formatPaymentMethod(txn.paymentMethod) : null,
  ].filter(Boolean);

  const badgeColor = isTransfer
    ? "#64748b"
    : cat?.color ?? (txn.type === "income" ? "#2c6b4f" : "#64748b");

  // Transfers keep a plain ⇆ symbol (money moving between your own accounts);
  // everything else shows an illustration — its category's, or one for its
  // type when it has no category.
  const fallbackIcon = txn.type === "income" || txn.type === "repayment" ? "dollars" : "more";

  // A repayment is created by settling a share and changes only with it, so it
  // can't be edited, copied or deleted on its own.
  const isRepayment = txn.type === "repayment";
  const owedShares = txn.shares.filter((s) => s.direction === "owed_to_you");
  const stillOwed = owedShares.some((s) => !s.settled);
  const yours = ownAmountOf(txn);

  const openOrToggle = () => {
    if (selectMode) onToggleSelect?.(txn.id);
    else if (!isRepayment) openEdit(txn);
  };

  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 px-2 py-2.5 transition-colors hover:bg-surface-2",
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
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-none"
        style={{ color: badgeColor }}
        aria-label="Edit transaction"
      >
        {!isTransfer ? (
          <CategoryIcon icon={cat?.icon ?? fallbackIcon} size={30} />
        ) : (
          <Icon name="arrow-left-right" size={20} strokeWidth={2.2} />
        )}
      </button>

      <button onClick={openOrToggle} className="min-w-0 flex-1 text-left">
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-sm font-medium text-fg">{txn.description}</p>
          {txn.recurringId && (
            <span className="shrink-0 rounded bg-brand-soft px-1.5 py-0.5 text-2xs font-medium text-brand-hover">auto</span>
          )}
          {owedShares.length > 0 && (
            <span className="shrink-0 rounded bg-brand-soft px-1.5 py-0.5 text-2xs font-medium text-brand-hover">
              {stillOwed ? "pending" : "settled"}
            </span>
          )}
        </div>
        <p className="truncate text-xs text-muted">
          {meta.join(" · ")}
          {txn.tags.length > 0 && <span className="text-faint"> · {txn.tags.map((t) => `#${t}`).join(" ")}</span>}
        </p>
      </button>

      <div className="flex shrink-0 flex-col items-end">
        <Money paise={signed} tone={TONE[txn.type]} sign={txn.type !== "expense" && txn.type !== "transfer"} className="text-sm font-semibold" />
        {owedShares.length > 0 && <span className="text-2xs text-faint">your share {formatINR(yours, { decimals: "auto" })}</span>}
        {showDate && <span className="text-2xs text-faint">{formatRelativeDay(fromISODate(txn.date) ?? new Date(), new Date())}</span>}
      </div>

      {!selectMode && !isRepayment && (
        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex h-9 w-9 items-center justify-center rounded-none p-1 text-faint opacity-100 sm:opacity-0 transition-opacity hover:text-fg focus:opacity-100 sm:group-hover:opacity-100 active:text-fg"
            aria-label="Transaction actions"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 z-20 mt-1 w-40 rounded-none border border-border bg-surface p-1 shadow-pop animate-scale-in">
                <MenuItem icon={<Pencil className="h-4 w-4" />} onClick={() => { setMenuOpen(false); openEdit(txn); }}>Edit</MenuItem>
                <MenuItem icon={<Copy className="h-4 w-4" />} onClick={onDuplicate}>Duplicate</MenuItem>
                <MenuItem icon={<Trash2 className="h-4 w-4" />} onClick={onDelete} danger>Delete</MenuItem>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, children, onClick, danger }: { icon: React.ReactNode; children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-none px-2.5 py-1.5 text-sm transition-colors hover:bg-surface-2",
        danger ? "text-expense" : "text-fg",
      )}
    >
      <span className={danger ? "text-expense" : "text-muted"}>{icon}</span>
      {children}
    </button>
  );
}
