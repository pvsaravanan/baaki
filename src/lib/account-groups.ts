import type { AccountType } from "./constants";

/** The headed groups of the Accounts page, in the order they appear. */
const GROUPS: { label: string; types: readonly AccountType[] }[] = [
  { label: "Bank Accounts", types: ["bank", "savings"] },
  { label: "Wallets", types: ["wallet"] },
  { label: "Cash", types: ["cash"] },
];
const OTHER = "Other Accounts";

export interface AccountGroup<A> {
  label: string;
  accounts: A[];
  /** Everything in the group added together, in paise. */
  total: number;
}

/** Accounts under their headings, keeping their order. Empty groups are left out. */
export function groupAccounts<A extends { type: string; balance: number }>(accounts: A[]): AccountGroup<A>[] {
  const labelOf = (type: string) => GROUPS.find((g) => (g.types as readonly string[]).includes(type))?.label ?? OTHER;
  return [...GROUPS.map((g) => g.label), OTHER].flatMap((label) => {
    const inGroup = accounts.filter((a) => labelOf(a.type) === label);
    if (inGroup.length === 0) return [];
    return [{ label, accounts: inGroup, total: inGroup.reduce((sum, a) => sum + a.balance, 0) }];
  });
}

/** What the accounts hold and what they owe, kept apart; `net` is one less the other. */
export function accountTotals(accounts: { balance: number }[]): { held: number; owed: number; net: number } {
  let held = 0;
  let owed = 0;
  for (const { balance } of accounts) {
    if (balance >= 0) held += balance;
    else owed -= balance;
  }
  return { held, owed, net: held - owed };
}
