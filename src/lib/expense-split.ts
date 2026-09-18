export type ExpenseSplitMethod = "equal" | "amounts" | "shares" | "percent";

export interface ExpenseSplitResult {
  amounts: number[];
  yourPercentage: number | null;
  error: string | null;
}

function hundredths(value: string): number | null {
  const text = value.trim();
  if (!/^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  const units = Number(whole || "0") * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(units) && units >= 0 ? units : null;
}

function allocate(total: number, weights: number[]): number[] {
  const denominator = weights.reduce((sum, weight) => sum + BigInt(weight), 0n);
  const parts = weights.map((weight, index) => {
    const numerator = BigInt(total) * BigInt(weight);
    return { index, amount: Number(numerator / denominator), remainder: numerator % denominator };
  });
  const remaining = total - parts.reduce((sum, part) => sum + part.amount, 0);
  const ranked = [...parts].sort((a, b) => a.remainder === b.remainder
    ? a.index - b.index : a.remainder > b.remainder ? -1 : 1);
  for (let i = 0; i < remaining; i += 1) parts[ranked[i].index].amount += 1;
  return parts.map((part) => part.amount);
}

export function calculateExpenseSplit(
  total: number,
  method: ExpenseSplitMethod,
  values: string[],
  yourWeight = "1",
): ExpenseSplitResult {
  const invalid = (error: string): ExpenseSplitResult => ({ amounts: Array(values.length + 1).fill(0), yourPercentage: null, error });
  if (!Number.isSafeInteger(total) || total <= 0) return invalid("Enter an expense amount greater than zero");
  if (!values.length) return invalid("Add at least one person to split with");
  if (values.length > 20) return invalid("An expense can be split with up to 20 people");
  if (method === "equal") {
    return { amounts: allocate(total, Array(values.length + 1).fill(1)), yourPercentage: null, error: null };
  }

  const parsed = values.map(hundredths);
  if (parsed.some((value) => value === null)) {
    return invalid("Enter a non-negative number with up to 2 decimal places for every person");
  }
  const units = parsed as number[];
  if (method === "amounts") {
    const sum = units.reduce((value, amount) => value + amount, 0);
    if (sum > total) return invalid("Shared amounts can't exceed the total");
    return { amounts: [total - sum, ...units], yourPercentage: null, error: null };
  }
  if (method === "percent") {
    const sum = units.reduce((value, percent) => value + percent, 0);
    if (sum > 10000) return invalid("Percentages can't exceed 100% in total");
    return { amounts: allocate(total, [10000 - sum, ...units]), yourPercentage: (10000 - sum) / 100, error: null };
  }

  const ownUnits = hundredths(yourWeight);
  if (ownUnits === null) return invalid("Enter a non-negative number of shares for yourself (up to 2 decimal places)");
  const weights = [ownUnits, ...units];
  if (weights.every((weight) => weight === 0)) return invalid("At least one person's shares must be greater than zero");
  return { amounts: allocate(total, weights), yourPercentage: null, error: null };
}
