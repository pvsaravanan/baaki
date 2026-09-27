import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { ApiError, apiPatch, apiPost } from "@/lib/http";
import type { ContactDTO } from "@/lib/types";
import { SWATCHES } from "./constants";

export function ContactForm({
  initial,
  onSaved,
  onCancel,
  onBusyChange,
}: {
  initial: ContactDTO | null;
  onSaved: (contacts: ContactDTO[]) => void;
  onCancel: () => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const editing = !!initial;
  const [name, setName] = useState(initial?.name ?? "");
  const [color] = useState(initial?.color ?? SWATCHES[Math.floor(Math.random() * SWATCHES.length)]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => onBusyChange?.(saving), [saving, onBusyChange]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    try {
      const res = editing
        ? await apiPatch<{ contacts: ContactDTO[] }>(`/api/contacts/${initial!.id}`, { name: name.trim(), color })
        : await apiPost<{ contacts: ContactDTO[] }>("/api/contacts", { name: name.trim(), color });
      onSaved(res.contacts);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save. Please try again.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error && (
        <div className="rounded-none border border-expense/30 bg-expense/10 px-3 py-2 text-sm text-expense">{error}</div>
      )}
      <Field label="Name" htmlFor="contact-name" required>
        <Input id="contact-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Priya, Roommate, Arjun" autoFocus />
      </Field>
      <div className="flex gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={saving} className="flex-1">Cancel</Button>
        <Button type="submit" loading={saving} className="flex-1">{editing ? "Save changes" : "Add person"}</Button>
      </div>
    </form>
  );
}
