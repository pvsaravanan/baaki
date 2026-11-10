"use client";
import { useEffect, useMemo, useState } from "react";
import { BarChart3, ChevronRight, Eye, EyeOff, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { formatINR } from "@/lib/money";
import { groupAccounts } from "@/lib/account-groups";
import { SectionIcon } from "./section-icon";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import { useAppData } from "./app-data";
import { ApiError, apiDelete, apiPatch } from "@/lib/http";
import type { AccountDTO } from "@/lib/types";
import { AccountForm } from "./accounts/account-form";
import { AccountRow, HIDDEN_AMOUNT } from "./accounts/account-row";
import { AccountActionsSheet, AccountSummarySheet } from "./accounts/account-sheets";

const GROUP_HEADING = "mb-2 text-label-sm uppercase tracking-[0.14em] text-muted";
const HIDE_BALANCES_KEY = "baaki.hideBalances";

/** A convenience for this device, so it's fine if storage is unavailable. */
function useHiddenBalances() {
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(HIDE_BALANCES_KEY) === "1";
    } catch {
      return false;
    }
  });
  const toggle = () => {
    const next = !hidden;
    setHidden(next);
    try {
      localStorage.setItem(HIDE_BALANCES_KEY, next ? "1" : "0");
    } catch {
      // It still applies until the page is left.
    }
  };
  return [hidden, toggle] as const;
}

export function AccountsView({
  accounts: initial,
  adding,
  onAddingChange,
}: {
  accounts: AccountDTO[];
  /** The Add form is opened from the page header. */
  adding: boolean;
  onAddingChange: (adding: boolean) => void;
}) {
  const { refresh } = useAppData();
  const toast = useToast();
  const confirm = useConfirm();

  const [accounts, setAccounts] = useState(initial);
  // Resync when the loaded prop changes — see the identical note in
  // CategoriesView; without this the list stays stale until a full reload.
  useEffect(() => setAccounts(initial), [initial]);
  const [selected, setSelected] = useState<AccountDTO | null>(null);
  const [editing, setEditing] = useState<AccountDTO | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hidden, toggleHidden] = useHiddenBalances();

  const active = useMemo(() => accounts.filter((a) => !a.isArchived), [accounts]);
  const archived = useMemo(() => accounts.filter((a) => a.isArchived), [accounts]);
  const groups = useMemo(() => groupAccounts(active), [active]);
  const totalBalance = useMemo(() => active.reduce((sum, a) => sum + a.balance, 0), [active]);

  const closeForm = () => {
    onAddingChange(false);
    setEditing(null);
  };

  function openEdit(a: AccountDTO) {
    setSelected(null);
    setEditing(a);
  }

  async function onDelete(a: AccountDTO) {
    setSelected(null);
    const ok = await confirm({
      title: `Delete ${a.name}?`,
      message:
        "This permanently removes the account. If it has transactions, it will be archived instead to preserve your history.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await apiDelete<{ archived: boolean; accounts: AccountDTO[] }>(`/api/accounts/${a.id}`);
      setAccounts(res.accounts);
      refresh();
      toast.success(res.archived ? `${a.name} archived (it has transactions)` : `${a.name} deleted`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not delete this account.");
    }
  }

  async function onRestore(a: AccountDTO) {
    setSelected(null);
    try {
      const res = await apiPatch<{ accounts: AccountDTO[] }>(`/api/accounts/${a.id}`, { isArchived: false });
      setAccounts(res.accounts);
      refresh();
      toast.success(`${a.name} restored`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not restore this account.");
    }
  }

  const renderRow = (a: AccountDTO) => (
    <AccountRow
      key={a.id}
      account={a}
      hidden={hidden}
      onOpen={() => setSelected(a)}
      onEdit={() => openEdit(a)}
      onDelete={() => onDelete(a)}
    />
  );

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-border/15 bg-brand-soft/40 p-4">
        <div className="flex items-center gap-1">
          <p className="text-body-sm text-fg">Total Balance</p>
          <button
            type="button"
            onClick={toggleHidden}
            aria-pressed={hidden}
            aria-label={hidden ? "Show balances" : "Hide balances"}
            className="flex h-9 w-9 items-center justify-center text-fg"
          >
            {hidden ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
          </button>
        </div>
        <p className="tnum text-[32px] font-extrabold leading-tight tracking-tight text-fg">
          {hidden ? HIDDEN_AMOUNT : formatINR(totalBalance)}
        </p>
      </section>

      {accounts.length === 0 ? (
        <div className="rounded-xl border border-border/25">
          <EmptyState
            illustration={<SectionIcon section="accounts" size={56} />}
            title="No accounts yet"
            description="Add a bank, wallet or card to start tracking balances."
            action={
              <Button onClick={() => onAddingChange(true)}>
                <Plus className="h-4 w-4" />
                Add account
              </Button>
            }
          />
        </div>
      ) : (
        <>
          {groups.map((g) => (
            <section key={g.label}>
              <h2 className={GROUP_HEADING}>{g.label}</h2>
              <ul className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">{g.accounts.map(renderRow)}</ul>
            </section>
          ))}

          {archived.length > 0 && (
            <section>
              <h2 className={GROUP_HEADING}>Archived</h2>
              <ul className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">{archived.map(renderRow)}</ul>
            </section>
          )}

          {active.length > 0 && (
            <button
              type="button"
              onClick={() => setSummaryOpen(true)}
              className="flex w-full items-center gap-3 rounded-xl bg-brand-soft/50 px-4 py-3.5 text-left text-body-sm font-medium text-fg transition-colors active:bg-brand-soft"
            >
              <BarChart3 aria-hidden className="h-5 w-5 shrink-0 text-brand-hover" />
              <span className="flex-1">Account Summary</span>
              <ChevronRight aria-hidden className="h-5 w-5 shrink-0" />
            </button>
          )}

          {/* Same dashed add row as the Categories screen. */}
          <button
            type="button"
            onClick={() => onAddingChange(true)}
            className="flex h-14 w-full items-center justify-center gap-2.5 rounded-xl border border-dashed border-border/50 bg-brand-soft/20 text-sm font-bold text-fg transition-colors hover:bg-brand-soft/40 active:bg-brand-soft/50 print:hidden"
          >
            <Plus aria-hidden className="h-5 w-5" />
            Add Account
          </button>
        </>
      )}

      <AccountActionsSheet
        account={selected}
        hidden={hidden}
        onClose={() => setSelected(null)}
        onEdit={openEdit}
        onDelete={onDelete}
        onRestore={onRestore}
      />
      <AccountSummarySheet open={summaryOpen} accounts={active} hidden={hidden} onClose={() => setSummaryOpen(false)} />

      <Modal
        open={adding || !!editing}
        onClose={closeForm}
        title={editing ? "Edit account" : "Add account"}
        description={editing ? undefined : "Choose an account type, select your bank and enter an opening balance."}
        busy={busy}
      >
        <AccountForm
          key={editing?.id ?? "new"}
          initial={editing}
          onSaved={(next) => {
            setAccounts(next);
            refresh();
            toast.success(editing ? "Account updated" : "Account added");
            closeForm();
          }}
          onCancel={closeForm}
          onBusyChange={setBusy}
        />
      </Modal>
    </div>
  );
}
