import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { Money } from "@/components/money";
import { useToast } from "@/components/ui/toast";
import { swrFetcher } from "@/lib/http";
import { formatDate, fromISODate } from "@/lib/dates";
import type { ContactDTO } from "@/lib/types";
import type { ContactShareRow } from "@/lib/contacts-service";
import { SettleModal } from "./settle-modal";
import { RecordEntryModal } from "./record-entry-modal";

export function ContactShares({ contact, onSettled }: { contact: ContactDTO; onSettled: () => void }) {
  const { data, mutate } = useSWR<{ shares: ContactShareRow[] }>(`/api/contacts/${contact.id}/shares`, swrFetcher);
  const [settling, setSettling] = useState<ContactShareRow | null>(null);
  const [recordOpen, setRecordOpen] = useState(false);
  const toast = useToast();

  const shares = data?.shares ?? [];

  return (
    <>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-label-sm uppercase text-faint">Ledger</span>
        <button type="button" onClick={() => setRecordOpen(true)} className="text-label-sm uppercase text-brand-hover hover:underline">
          + Record entry
        </button>
      </div>

      {data && shares.length === 0 ? (
        <p className="text-sm text-muted">No shared expenses with {contact.name} yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {shares.map((s) => {
            const youOwe = s.direction === "you_owe";
            return (
              <li key={s.id} className="flex items-center justify-between gap-3 rounded-none border border-border-faint bg-surface-2/50 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm text-fg">{s.description}</p>
                  <p className="text-2xs text-faint">
                    {youOwe ? "You owe" : "Owes you"} · {formatDate(fromISODate(s.date) ?? new Date())}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Money paise={s.amount} tone={youOwe ? "expense" : "income"} className="text-sm font-medium" />
                  {s.settled ? (
                    <Badge tone="neutral">Settled</Badge>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => setSettling(s)}>Settle</Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <SettleModal
        share={settling}
        contactName={contact.name}
        onClose={() => setSettling(null)}
        onSettled={() => {
          setSettling(null);
          mutate();
          onSettled();
          toast.success("Marked as settled");
        }}
      />

      <RecordEntryModal
        contact={contact}
        open={recordOpen}
        onClose={() => setRecordOpen(false)}
        onRecorded={() => {
          setRecordOpen(false);
          mutate();
          onSettled();
          toast.success("Entry recorded");
        }}
      />
    </>
  );
}
