/**
 * Splitting an expense you paid for. All amounts are integer paise.
 *
 * Equal: the amount (less any shares already paid back) is divided between
 * the people and you, rounded down to the paisa. Any paise left over stay
 * with you, so the shares never add up to more than the bill.
 */

export type SplitMode = "equal" | "custom";

/** Each person's share when splitting `available` equally with `people` others and you. */
export function equalShare(available: number, people: number): number {
  if (people <= 0 || available <= 0) return 0;
  return Math.floor(available / (people + 1));
}

/** The shares for these people, in order: equal, or the amounts typed (custom). */
export function shareAmounts(mode: SplitMode, available: number, typed: number[]): number[] {
  if (mode === "custom") return typed;
  const each = equalShare(available, typed.length);
  return typed.map(() => each);
}

/** What's left for you after the other shares: negative when they add up to more. */
export function yourShare(total: number, shares: number[]): number {
  return total - shares.reduce((sum, s) => sum + s, 0);
}

/** Whether a set of saved shares is an equal split of `available` (to open the editor in the right mode). */
export function isEqualSplit(available: number, shares: number[]): boolean {
  if (shares.length === 0) return true;
  const each = equalShare(available, shares.length);
  return shares.every((s) => s === each);
}
