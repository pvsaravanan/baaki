"use client";
import { useEffect, useState } from "react";
import { Plus, UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { Money } from "@/components/money";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import { useAppData } from "./app-data";
import { ApiError, apiDelete } from "@/lib/http";
import type { ContactDTO } from "@/lib/types";
import { ContactCard } from "./people/contact-card";
import { ContactForm } from "./people/contact-form";

export function PeopleView({ contacts: initial }: { contacts: ContactDTO[] }) {
  const { refresh } = useAppData();
  const toast = useToast();
  const confirm = useConfirm();

  const [contacts, setContacts] = useState(initial);
  useEffect(() => setContacts(initial), [initial]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ContactDTO | null>(null);
  const [busy, setBusy] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const active = contacts.filter((c) => !c.isArchived);
  const archived = contacts.filter((c) => c.isArchived);
  // Archiving only hides a contact from the active list — it's explicitly
  // meant to preserve their unsettled debts (see deleteContact), so the
  // summary totals must still include archived contacts or it understates
  // what's actually owed.
  const totalOwedToYou = contacts.reduce((sum, c) => sum + c.owedToYou, 0);
  const totalYouOwe = contacts.reduce((sum, c) => sum + c.youOwe, 0);

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(c: ContactDTO) {
    setEditing(c);
    setFormOpen(true);
  }

  async function onDelete(c: ContactDTO) {
    const ok = await confirm({
      title: `Remove ${c.name}?`,
      message:
        c.owedToYou > 0
          ? "They still owe you money on unsettled shares. If they have any split history, they'll be archived instead of removed."
          : "If they have any split history, they'll be archived instead of removed.",
      confirmLabel: "Remove",
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await apiDelete<{ contacts: ContactDTO[] }>(`/api/contacts/${c.id}`);
      setContacts(res.contacts);
      refresh();
      toast.success(`${c.name} removed`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not remove this person.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-none border border-border bg-surface-2 px-4 py-3">
        <div className="flex gap-6">
          <div>
            <p className="text-xs font-medium text-muted">Owed to you</p>
            <Money paise={totalOwedToYou} tone="income" className="text-2xl font-semibold" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted">You owe</p>
            <Money paise={totalYouOwe} tone="expense" className="text-2xl font-semibold" />
          </div>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4" />
          Add person
        </Button>
      </div>

      {contacts.length === 0 ? (
        <div className="rounded-none border border-border bg-surface">
          <EmptyState
            icon={<UserCircle2 className="h-5 w-5" />}
            title="No one yet"
            description="Add a person to split expenses with them and track who owes what."
            action={
              <Button onClick={openAdd}>
                <Plus className="h-4 w-4" />
                Add person
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {active.map((c) => (
              <ContactCard
                key={c.id}
                contact={c}
                expanded={expandedId === c.id}
                onToggle={() => setExpandedId((cur) => (cur === c.id ? null : c.id))}
                onEdit={() => openEdit(c)}
                onDelete={() => onDelete(c)}
                onSettled={refresh}
              />
            ))}
          </ul>

          {archived.length > 0 && (
            <div className="space-y-2 pt-2">
              <h2 className="text-xs font-medium uppercase tracking-wide text-faint">Archived</h2>
              <ul className="space-y-2">
                {archived.map((c) => (
                  <ContactCard
                    key={c.id}
                    contact={c}
                    expanded={expandedId === c.id}
                    onToggle={() => setExpandedId((cur) => (cur === c.id ? null : c.id))}
                    onEdit={() => openEdit(c)}
                    onDelete={() => onDelete(c)}
                    onSettled={refresh}
                  />
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit person" : "Add person"}
        description={editing ? undefined : "Give them a name so you can split expenses with them."}
        busy={busy}
      >
        <ContactForm
          key={editing?.id ?? "new"}
          initial={editing}
          onSaved={(next) => {
            setContacts(next);
            refresh();
            toast.success(editing ? "Person updated" : "Person added");
            setFormOpen(false);
          }}
          onCancel={() => setFormOpen(false)}
          onBusyChange={setBusy}
        />
      </Modal>
    </div>
  );
}
