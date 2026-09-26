"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { Money } from "@/components/money";
import { Icon } from "@/components/icon";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import { useAppData } from "./app-data";
import { ApiError, apiDelete } from "@/lib/http";
import type { AccountDTO } from "@/lib/types";
import { AccountCard } from "./accounts/account-card";
import { AccountForm } from "./accounts/account-form";

export function AccountsView({ accounts: initial }: { accounts: AccountDTO[] }) {
  const { refresh } = useAppData();
  const toast = useToast();
  const confirm = useConfirm();

  const [accounts, setAccounts] = useState(initial);
  // Resync when the server-rendered prop changes — see the identical note in
  // CategoriesView; without this the list stays stale until a full reload.
  useEffect(() => setAccounts(initial), [initial]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AccountDTO | null>(null);
  const [busy, setBusy] = useState(false);

  const totalBalance = useMemo(
    () => accounts.filter((a) => !a.isArchived).reduce((sum, a) => sum + a.balance, 0),
    [accounts],
  );

  const active = accounts.filter((a) => !a.isArchived);
  const archived = accounts.filter((a) => a.isArchived);

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(a: AccountDTO) {
    setEditing(a);
    setFormOpen(true);
  }

  async function onDelete(a: AccountDTO) {
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

  return (
    <div className="space-y-4">
      {/* Total balance summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-none border border-border bg-surface-2 px-4 py-3">
        <div>
          <p className="text-xs font-medium text-muted">Total balance</p>
          <Money paise={totalBalance} tone="default" className="text-2xl font-semibold" />
          <p className="mt-0.5 text-2xs text-faint">
            across {active.length} active account{active.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4" />
          Add account
        </Button>
      </div>

      {accounts.length === 0 ? (
        <div className="rounded-none border border-border bg-surface">
          <EmptyState
            icon={<Icon name="wallet" size={20} />}
            title="No accounts yet"
            description="Add a bank, wallet or card to start tracking balances."
            action={
              <Button onClick={openAdd}>
                <Plus className="h-4 w-4" />
                Add account
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((a) => (
              <AccountCard key={a.id} account={a} onEdit={() => openEdit(a)} onDelete={() => onDelete(a)} />
            ))}
          </ul>

          {archived.length > 0 && (
            <div className="space-y-3 pt-2">
              <h2 className="text-xs font-medium uppercase tracking-wide text-faint">Archived</h2>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {archived.map((a) => (
                  <AccountCard key={a.id} account={a} onEdit={() => openEdit(a)} onDelete={() => onDelete(a)} />
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
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
            setFormOpen(false);
          }}
          onCancel={() => setFormOpen(false)}
          onBusyChange={setBusy}
        />
      </Modal>
    </div>
  );
}
