"use client";
import { useMemo, useState } from "react";
import { Check, HandCoins, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { Money } from "@/components/money";
import { cn } from "@/lib/cn";
import { formatDate, fromISODate } from "@/lib/dates";
import { ApiError, apiPost } from "@/lib/http";
import { formatINR } from "@/lib/money";
import type { OpenSplitDTO } from "@/lib/types";
import { useAppData } from "./app-data";
import { Sheet } from "./sheet";

interface Person {
  key: string;
  name: string;
  total: number;
  shares: OpenSplitDTO[];
}

/** Shares grouped by who owes them (names compared without case or extra spaces), most owed first. */
function byPerson(shares: OpenSplitDTO[]): Person[] {
  const map = new Map<string, Person>();
  for (const s of shares) {
    const key = s.name.trim().replace(/\s+/g, " ").toLowerCase();
    const person = map.get(key) ?? { key, name: s.name.trim(), total: 0, shares: [] };
    person.total += s.amount;
    person.shares.push(s);
    map.set(key, person);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

const dateOf = (iso: string) => {
  const d = fromISODate(iso);
  return d ? formatDate(d) : iso;
};

/**
 * Money people owe you from split expenses, by person. "Paid back" asks which
 * account the money came into; recent ones can be undone.
 */
export function SplitsView({ open, settled, onChanged }: { open: OpenSplitDTO[]; settled: OpenSplitDTO[]; onChanged: () => void }) {
  const { accounts, refresh } = useAppData();
  const toast = useToast();
  const people = useMemo(() => byPerson(open), [open]);
  const total = open.reduce((sum, s) => sum + s.amount, 0);
  const [settling, setSettling] = useState<{ title: string; shares: OpenSplitDTO[] } | null>(null);
  const [busy, setBusy] = useState(false);

  const done = () => {
    refresh(); // account balances
    onChanged();
  };

  async function undo(ids: string[]) {
    setBusy(true);
    try {
      await apiPost("/api/splits/unsettle", { ids });
      done();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't undo that");
    } finally {
      setBusy(false);
    }
  }

  async function settle(shares: OpenSplitDTO[], accountId: string) {
    setBusy(true);
    const ids = shares.map((s) => s.id);
    try {
      await apiPost("/api/splits/settle", { ids, accountId });
      setSettling(null);
      done();
      const amount = shares.reduce((sum, s) => sum + s.amount, 0);
      const account = accounts.find((a) => a.id === accountId)?.name ?? "the account";
      toast.success(`${formatINR(amount)} added to ${account}`, { label: "Undo", onClick: () => void undo(ids) });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't mark it as paid back");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border/25 bg-brand-soft/50 px-5 py-4">
        <p className="text-body-sm text-fg">To collect</p>
        <p className="tnum text-[32px] font-extrabold leading-tight tracking-tight text-fg">{formatINR(total)}</p>
        <p className="text-xs text-muted">
          {people.length === 0 ? "Nobody owes you anything." : `From ${people.length} ${people.length === 1 ? "person" : "people"}`}
        </p>
      </section>

      {people.length === 0 ? (
        <div className="rounded-xl border border-border/25">
          <EmptyState
            icon={<HandCoins className="h-6 w-6" />}
            title="Nothing to collect"
            description="Paid for someone? Turn on Split with others when you add the expense, and what they owe shows up here."
          />
        </div>
      ) : (
        <ul className="space-y-3">
          {people.map((p) => (
            <li key={p.key} className="overflow-hidden rounded-xl border border-border/25">
              <div className="flex items-center gap-3 px-4 pb-2 pt-3.5">
                <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-base font-bold text-fg">
                  {p.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-fg">{p.name}</p>
                  <p className="text-xs text-muted">owes you</p>
                </div>
                <Money paise={p.total} className="text-base font-bold" />
              </div>
              <ul className="divide-y divide-border/10 px-4">
                {p.shares.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body-sm text-fg">{s.description}</p>
                      <p className="text-xs text-muted">{dateOf(s.date)}</p>
                    </div>
                    <span className="tnum text-body-sm text-fg">{formatINR(s.amount)}</span>
                    {p.shares.length > 1 && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setSettling({ title: `${p.name} paid back`, shares: [s] })}
                        className="h-9 shrink-0 rounded-full border border-border/40 px-3 text-xs font-bold text-fg transition-colors active:bg-surface-2 disabled:opacity-50"
                      >
                        Paid
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              <div className="px-4 pb-3.5 pt-1">
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => setSettling({ title: `${p.name} paid back`, shares: p.shares })}
                  className="w-full !rounded-lg"
                >
                  <Check className="h-4 w-4" />
                  {p.shares.length > 1 ? `All paid back · ${formatINR(p.total)}` : "Paid back"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {settled.length > 0 && (
        <section>
          <h2 className="mb-2 text-label-md uppercase tracking-[0.08em] text-muted">Recently paid back</h2>
          <ul className="divide-y divide-border/10 rounded-xl border border-border/25 px-4">
            {settled.map((s) => (
              <li key={s.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-sm text-fg">
                    {s.name} · {s.description}
                  </p>
                  <p className="text-xs text-muted">
                    {formatINR(s.amount)} into {accounts.find((a) => a.id === s.settledAccountId)?.name ?? "an account"}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void undo([s.id])}
                  aria-label={`Undo ${s.name}'s payment for ${s.description}`}
                  className="flex h-9 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-bold text-brand-hover active:bg-surface-2 disabled:opacity-50"
                >
                  <Undo2 className="h-4 w-4" />
                  Undo
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <SettleSheet
        key={settling?.shares.map((s) => s.id).join() ?? "none"}
        settling={settling}
        busy={busy}
        onClose={() => setSettling(null)}
        onSettle={settle}
      />
    </div>
  );
}

/** Where did the money come back to? Starts on the account the expense was paid from. */
function SettleSheet({
  settling,
  busy,
  onClose,
  onSettle,
}: {
  settling: { title: string; shares: OpenSplitDTO[] } | null;
  busy: boolean;
  onClose: () => void;
  onSettle: (shares: OpenSplitDTO[], accountId: string) => void;
}) {
  const { accounts } = useAppData();
  const live = accounts.filter((a) => !a.isArchived);
  const first = settling?.shares[0]?.accountId;
  const [accountId, setAccountId] = useState(live.find((a) => a.id === first)?.id ?? live[0]?.id ?? "");
  const amount = settling?.shares.reduce((sum, s) => sum + s.amount, 0) ?? 0;

  return (
    <Sheet open={!!settling} onClose={onClose} title={settling?.title}>
      <p className="mb-3 text-body-sm text-muted">
        Which account did the {formatINR(amount)} come into? It&apos;s added to that balance, and it doesn&apos;t count as income.
      </p>
      <div role="radiogroup" aria-label="Received into" className="max-h-[45dvh] overflow-y-auto overscroll-contain">
        {live.map((a) => (
          <button
            key={a.id}
            type="button"
            role="radio"
            aria-checked={a.id === accountId}
            onClick={() => setAccountId(a.id)}
            className="flex w-full items-center gap-3 border-b border-border/10 py-3 text-left text-body-sm text-fg"
          >
            <span className="min-w-0 flex-1 truncate font-medium">{a.name}</span>
            <span className="tnum text-muted">{formatINR(a.balance)}</span>
            <Check className={cn("h-5 w-5 shrink-0 text-brand-hover", a.id !== accountId && "invisible")} />
          </button>
        ))}
      </div>
      <Button
        size="lg"
        loading={busy}
        disabled={!accountId || !settling}
        onClick={() => settling && onSettle(settling.shares, accountId)}
        className="mt-4 w-full !rounded-lg"
      >
        Mark as paid back
      </Button>
    </Sheet>
  );
}
