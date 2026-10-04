/**
 * "You can't spend more than an account holds." A change to the transactions
 * you record is refused when it would lower an account's balance below ₹0.
 *
 * Credit card and loan accounts are exempt (their balance is what you owe),
 * and only changes that *lower* a balance are checked — so editing the note on
 * an old transaction, or anything that adds money, is never blocked, even on
 * an account that's already below ₹0.
 */
import { BALANCE_EXEMPT_ACCOUNT_TYPES } from "./constants";

/** The part of a transaction that moves money between accounts. */
export interface Movement {
  type: string;
  amount: number; // paise
  accountId: string;
  transferAccountId?: string | null;
}

export interface GuardedAccount {
  id: string;
  name: string;
  type: string;
  /** Current balance (paise), including the `before` movements. */
  balance: number;
}

export interface Shortfall {
  accountId: string;
  name: string;
  /** What this entry can use from the account (paise), never below 0. */
  available: number;
}

/** Net effect of some movements on each account's balance (paise). */
export function accountDeltas(moves: Movement[]): Map<string, number> {
  const deltas = new Map<string, number>();
  const add = (id: string, v: number) => deltas.set(id, (deltas.get(id) ?? 0) + v);
  for (const m of moves) {
    if (m.type === "income" || m.type === "repayment") add(m.accountId, m.amount);
    else if (m.type === "expense") add(m.accountId, -m.amount);
    else if (m.type === "transfer") {
      add(m.accountId, -m.amount);
      if (m.transferAccountId) add(m.transferAccountId, m.amount);
    }
  }
  return deltas;
}

/** Accounts whose balance the change would lower */
export function accountsLowered(before: Movement[], after: Movement[]): string[] {
  const b = accountDeltas(before);
  const a = accountDeltas(after);
  const ids = new Set([...b.keys(), ...a.keys()]);
  return [...ids].filter((id) => (a.get(id) ?? 0) - (b.get(id) ?? 0) < 0);
}

/**
 * Accounts that replacing `before` with `after` would take below ₹0. `before`
 * is what's already recorded (empty for a new entry, the old version for an
 * edit); `accounts` carry their current balances.
 */
export function balanceShortfalls(before: Movement[], after: Movement[], accounts: GuardedAccount[]): Shortfall[] {
  const b = accountDeltas(before);
  const a = accountDeltas(after);
  const out: Shortfall[] = [];
  for (const acc of accounts) {
    if (BALANCE_EXEMPT_ACCOUNT_TYPES.includes(acc.type)) continue;
    const change = (a.get(acc.id) ?? 0) - (b.get(acc.id) ?? 0);
    if (change >= 0) continue;
    if (acc.balance + change < 0) {
      // Balance without the entry being replaced — what's there to spend.
      const withoutOld = acc.balance - (b.get(acc.id) ?? 0);
      out.push({ accountId: acc.id, name: acc.name, available: Math.max(0, withoutOld) });
    }
  }
  return out;
}
