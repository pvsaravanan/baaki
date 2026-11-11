"use client";
import { useRef } from "react";
import { Check, Plus, Users, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/cn";
import { formatINR, toPaise } from "@/lib/money";
import { shareAmounts, yourShare, type SplitMode } from "@/lib/split";
import type { SplitDTO } from "@/lib/types";

/** One person in the split editor: what's typed, before it's checked. */
export interface SplitPerson {
  key: string;
  name: string;
  /** Rupees as typed; only used for a custom split. */
  amount: string;
}

let nextKey = 0;
export const newPerson = (name = "", amount = ""): SplitPerson => ({ key: `p${nextKey++}`, name, amount });

function paiseOf(text: string): number {
  try {
    return toPaise(text);
  } catch {
    return NaN;
  }
}

/**
 * The shares to save, and your own, for an expense of `total` paise. Shares
 * already paid back stay as they are, so only what's left is split. `problem`
 * says what to fix before saving.
 */
export function buildSplits(mode: SplitMode, total: number, settled: SplitDTO[], people: SplitPerson[]) {
  const settledSum = settled.reduce((sum, s) => sum + s.amount, 0);
  const available = total - settledSum;
  const amounts = shareAmounts(mode, available, people.map((p) => paiseOf(p.amount)));
  const splits = people.map((p, i) => ({ name: p.name.trim(), amount: amounts[i] }));
  const yours = yourShare(available, amounts);
  let problem: string | null = null;
  if (splits.some((s) => !s.name)) problem = "Add a name for everyone in the split";
  else if (splits.some((s) => !Number.isFinite(s.amount) || s.amount <= 0)) problem = "Give everyone in the split an amount";
  else if (yours < 0) problem = "The split adds up to more than the amount";
  return { splits, yours: Number.isFinite(yours) ? yours : 0, problem };
}

/**
 * "Split with others" on an expense: type who you paid for and how much
 * they owe. Your own share is what's left, and only that counts as your
 * spending. Shares already paid back are shown but can't be changed here.
 */
export function SplitSection({
  total,
  on,
  onToggle,
  mode,
  onMode,
  people,
  onPeople,
  settled,
  error,
}: {
  total: number;
  on: boolean;
  onToggle: (on: boolean) => void;
  mode: SplitMode;
  onMode: (mode: SplitMode) => void;
  people: SplitPerson[];
  onPeople: (people: SplitPerson[]) => void;
  settled: SplitDTO[];
  error?: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const { splits, yours } = buildSplits(mode, total, settled, people);

  const update = (key: string, patch: Partial<SplitPerson>) => onPeople(people.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  const add = () => {
    onPeople([...people, newPerson()]);
    // Focus the new name once it's on screen.
    requestAnimationFrame(() => listRef.current?.querySelector<HTMLInputElement>("[data-split-row]:last-of-type input")?.focus());
  };

  return (
    <div className={cn("overflow-hidden rounded-lg border", on ? "border-brand-soft" : error ? "border-expense" : "border-border/20")}>
      <div className={cn("flex items-center gap-3 px-3.5 py-2.5", on && "bg-brand-soft")}>
        <Users className="h-5 w-5 shrink-0 text-fg" />
        <span className="flex-1 text-body-sm font-bold text-fg">Split with others</span>
        {/* Shares already paid back can't be dropped by switching the split off. */}
        <Switch checked={on} onChange={onToggle} disabled={settled.length > 0} label="Split with others" />
      </div>

      {on && (
        <div className="space-y-3 px-3.5 pb-3.5 pt-3 text-body-sm">
          <div role="radiogroup" aria-label="How to split" className="flex gap-1 rounded-full bg-surface-2/70 p-1">
            {(["equal", "custom"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => onMode(m)}
                className={cn(
                  "h-9 flex-1 rounded-full text-[13px] font-bold transition-colors",
                  mode === m ? "bg-brand text-brand-fg" : "text-fg",
                )}
              >
                {m === "equal" ? "Equally" : "Custom amounts"}
              </button>
            ))}
          </div>

          <div ref={listRef} className="space-y-2">
            {settled.map((s) => (
              <div key={s.id} className="flex items-center gap-2 rounded-lg bg-surface-2/60 px-3 py-2.5">
                <span className="min-w-0 flex-1 truncate font-medium text-fg">{s.name}</span>
                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-income">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  Paid back
                </span>
                <span className="tnum shrink-0 text-fg">{formatINR(s.amount)}</span>
              </div>
            ))}
            {people.map((p, i) => (
              <div key={p.key} data-split-row className="flex items-center gap-2">
                <input
                  value={p.name}
                  onChange={(e) => update(p.key, { name: e.target.value })}
                  maxLength={60}
                  autoCapitalize="words"
                  enterKeyHint="next"
                  aria-label={`Person ${i + 1} name`}
                  placeholder="Name"
                  className="h-11 min-w-0 flex-1 rounded-lg border border-border/30 bg-surface px-3 text-fg placeholder:text-muted focus:border-brand focus:outline-none"
                />
                {mode === "custom" ? (
                  <label className="flex h-11 w-28 shrink-0 items-center gap-1 rounded-lg border border-border/30 bg-surface px-3 focus-within:border-brand">
                    <span className="text-muted">₹</span>
                    <input
                      value={p.amount}
                      onChange={(e) => update(p.key, { amount: e.target.value.replace(/[^\d.]/g, "") })}
                      inputMode="decimal"
                      aria-label={`${p.name.trim() || `Person ${i + 1}`}'s share`}
                      placeholder="0"
                      className="tnum w-full min-w-0 bg-transparent text-right text-fg placeholder:text-muted focus:outline-none"
                    />
                  </label>
                ) : (
                  <span className="tnum w-24 shrink-0 text-right text-fg">{formatINR(splits[i]?.amount ?? 0)}</span>
                )}
                <button
                  type="button"
                  onClick={() => onPeople(people.filter((x) => x.key !== p.key))}
                  aria-label={`Remove ${p.name.trim() || `person ${i + 1}`}`}
                  className="flex h-11 w-8 shrink-0 items-center justify-center text-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={add}
            disabled={people.length + settled.length >= 20}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border/50 font-bold text-fg transition-colors active:bg-brand-soft/40 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add person
          </button>

          <div className="flex items-center justify-between border-t border-border/10 pt-3">
            <span className="text-muted">Your share</span>
            <span className={cn("tnum font-bold", yours < 0 ? "text-expense" : "text-fg")}>{formatINR(yours)}</span>
          </div>
          <p className="text-xs text-muted">Only your share counts as your spending. Mark the rest as paid back from To collect.</p>
        </div>
      )}
      {error && <p className="px-3.5 pb-2.5 text-body-sm text-expense">{error}</p>}
    </div>
  );
}
