import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Icon } from "@/components/icon";
import { BANKS, type Bank } from "@/lib/banks";
import { BankLogo } from "../bank-logo";
import { OTHER_BANK } from "./constants";

export function BankPicker({
  bankId,
  query,
  onQueryChange,
  onPick,
  error,
}: {
  bankId: string | null;
  query: string;
  onQueryChange: (q: string) => void;
  onPick: (bank: Bank | "other" | null) => void;
  error?: string;
}) {
  const q = query.trim().toLowerCase();
  const matches = q
    ? BANKS.filter((b) => b.name.toLowerCase().includes(q) || b.shortName.toLowerCase().includes(q))
    : BANKS;

  const selected = bankId && bankId !== OTHER_BANK ? BANKS.find((b) => b.id === bankId) : null;
  const isOther = bankId === OTHER_BANK;

  return (
    <Field label="Bank" error={error} hint={error ? undefined : "Pick your bank — its name, color and logo are filled in automatically."}>
      {selected ? (
        <div className="flex items-center gap-3 rounded-none border border-border bg-surface-2 px-3 py-2">
          <BankLogo bank={selected} size={32} />
          <p className="flex-1 truncate text-sm text-fg">{selected.name}</p>
          <Button type="button" variant="ghost" size="sm" onClick={() => onPick(null)}>
            Change
          </Button>
        </div>
      ) : isOther ? (
        <div className="flex items-center gap-3 rounded-none border border-border bg-surface-2 px-3 py-2">
          <span className="flex h-8 w-8 items-center justify-center text-muted">
            <Icon name="landmark" size={18} />
          </span>
          <p className="flex-1 truncate text-sm text-fg">Other bank</p>
          <Button type="button" variant="ghost" size="sm" onClick={() => onPick(null)}>
            Change
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search banks…"
            aria-label="Search banks"
          />
          <ul className="max-h-48 overflow-y-auto rounded-none border border-border">
            {matches.map((bank) => (
              <li key={bank.id}>
                <button
                  type="button"
                  onClick={() => onPick(bank)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-fg hover:bg-surface-2 focus:bg-surface-2 focus:outline-none"
                >
                  <BankLogo bank={bank} size={28} />
                  {bank.name}
                </button>
              </li>
            ))}
            {matches.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted">No matching banks.</li>
            )}
            <li>
              <button
                type="button"
                onClick={() => onPick("other")}
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-muted hover:bg-surface-2 focus:bg-surface-2 focus:outline-none"
              >
                <span className="flex h-7 w-7 items-center justify-center text-muted">
                  <Icon name="landmark" size={18} />
                </span>
                Other bank (not listed)
              </button>
            </li>
          </ul>
        </div>
      )}
    </Field>
  );
}
