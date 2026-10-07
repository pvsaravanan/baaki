import { useState } from "react";
import { ChevronDown, ChevronUp, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { Money } from "@/components/money";
import { Modal } from "@/components/ui/modal";
import { Field } from "@/components/ui/field";
import { SelectMenu } from "@/components/ui/select-menu";
import { useToast } from "@/components/ui/toast";
import { ApiError, apiPatch } from "@/lib/http";
import { formatDate, fromISODate } from "@/lib/dates";
import type { ContactDTO } from "@/lib/types";
import type { ContactShareRow } from "@/lib/contacts-service";
import { SettleModal } from "./settle-modal";

/**
 * Shares of split expenses that nobody has been named for yet. They are
 * settled like any other share; "Name them" attaches one to a person.
 */
export function SomeoneCard({
  shares,
  contacts,
  onChanged,
}: {
  shares: ContactShareRow[];
  contacts: ContactDTO[];
  onChanged: (next: { contacts: ContactDTO[]; someone: ContactShareRow[] } | null) => void;
}) {
  const toast = useToast();
  const [expanded, setExpanded] = useState(false);
  const [settling, setSettling] = useState<ContactShareRow | null>(null);
  const [naming, setNaming] = useState<ContactShareRow | null>(null);
  const [contactId, setContactId] = useState("");
  const [busy, setBusy] = useState(false);

  const owed = shares.filter((s) => !s.settled).reduce((sum, s) => sum + s.amount, 0);
  const people = contacts.filter((c) => !c.isArchived);

  async function onName() {
    if (!naming || !contactId) return;
    setBusy(true);
    try {
      const res = await apiPatch<{ contacts: ContactDTO[]; someone: ContactShareRow[] }>(`/api/shares/${naming.id}`, { contactId });
      setNaming(null);
      setContactId("");
      onChanged(res);
      toast.success("Person added to the share");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not do that. Please try again.");
    }
    setBusy(false);
  }

  return (
    <li className="rounded-none border border-border bg-surface">
      <button onClick={() => setExpanded((e) => !e)} className="flex w-full items-center gap-3 p-4 text-left">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center text-muted">
          <UserRound className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-fg">Someone</p>
          <p className="text-xs text-muted">{owed > 0 ? "Owes you" : "All settled up"}</p>
        </div>
        {owed > 0 && <Money paise={owed} tone="income" className="text-base font-semibold" />}
        {expanded ? <ChevronUp className="h-4 w-4 text-faint" /> : <ChevronDown className="h-4 w-4 text-faint" />}
      </button>

      {expanded && (
        <ul className="space-y-1.5 border-t border-border p-4 pt-3">
          {shares.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 rounded-none border border-border-faint bg-surface-2/50 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm text-fg">{s.description}</p>
                <p className="text-2xs text-faint">Owes you · {formatDate(fromISODate(s.date) ?? new Date())}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Money paise={s.amount} tone="income" className="text-sm font-medium" />
                {s.settled ? (
                  <Badge tone="neutral">Settled</Badge>
                ) : (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setNaming(s)} disabled={people.length === 0}>Name</Button>
                    <Button size="sm" variant="secondary" onClick={() => setSettling(s)}>Settle</Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <SettleModal
        share={settling}
        contactName="Someone"
        onClose={() => setSettling(null)}
        onSettled={() => {
          setSettling(null);
          onChanged(null);
          toast.success("Marked as settled");
        }}
      />

      <Modal
        open={!!naming}
        onClose={() => setNaming(null)}
        title="Who paid this share?"
        description={naming ? `Attach "${naming.description}" to a person from your People list.` : undefined}
        busy={busy}
        size="sm"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setNaming(null)} disabled={busy} className="flex-1">Cancel</Button>
            <Button onClick={onName} loading={busy} disabled={!contactId} className="flex-1">Save</Button>
          </div>
        }
      >
        <Field label="Person" htmlFor="someone-person">
          <SelectMenu
            id="someone-person"
            value={contactId}
            onChange={setContactId}
            options={[{ value: "", label: "Choose person…" }, ...people.map((c) => ({ value: c.id, label: c.name }))]}
          />
        </Field>
      </Modal>
    </li>
  );
}
