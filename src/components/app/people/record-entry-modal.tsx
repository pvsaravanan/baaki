import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { Modal } from "@/components/ui/modal";
import { ApiError, apiPost } from "@/lib/http";
import { toISODate } from "@/lib/dates";
import { toPaise } from "@/lib/money";
import type { ContactDTO, ShareDirection } from "@/lib/types";

export function RecordEntryModal({
  contact,
  open,
  onClose,
  onRecorded,
}: {
  contact: ContactDTO;
  open: boolean;
  onClose: () => void;
  onRecorded: () => void;
}) {
  const [direction, setDirection] = useState<ShareDirection>("you_owe");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(toISODate(new Date()));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    let paise = 0;
    try {
      paise = toPaise(amount);
    } catch {
      setError("Enter a valid amount");
      return;
    }
    if (paise <= 0) {
      setError("Amount must be greater than zero");
      return;
    }
    setBusy(true);
    try {
      await apiPost(`/api/contacts/${contact.id}/shares`, {
        amount: paise,
        direction,
        description: description.trim() || null,
        date,
      });
      onRecorded();
      // Reset for next time.
      setAmount("");
      setDescription("");
      setDirection("you_owe");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not record this entry.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Record entry" description={`A debt between you and ${contact.name}.`} busy={busy} size="sm">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && <div className="rounded-none border border-expense/30 bg-expense/10 px-3 py-2 text-sm text-expense">{error}</div>}
        <Segmented
          value={direction}
          onChange={setDirection}
          options={[
            { value: "you_owe" as ShareDirection, label: `You owe ${contact.name}` },
            { value: "owed_to_you" as ShareDirection, label: `${contact.name} owes you` },
          ]}
          size="sm"
          className="w-full [&>button]:flex-1"
        />
        <Field label="Amount (₹)" htmlFor="entry-amount" required>
          <Input id="entry-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0" autoFocus />
        </Field>
        <Field label="Description" htmlFor="entry-desc">
          <Input id="entry-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Movie tickets, Lunch" />
        </Field>
        <Field label="Date" htmlFor="entry-date">
          <Input id="entry-date" type="date" value={date} max={toISODate(new Date())} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy} className="flex-1">Cancel</Button>
          <Button type="submit" loading={busy} className="flex-1">Record</Button>
        </div>
      </form>
    </Modal>
  );
}
