/**
 * Illustrative numbers for the sign-in masthead, new on every page load.
 * They're decoration, not anyone's data — kept realistic and in the design's
 * shape: Bills < Food < Travel (the chart is a rising staircase), a legend
 * that adds up to 100%, and a recent month.
 */
import { addMonthsToDate, monthName, zonedParts } from "./dates";

export interface MastheadSample {
  bills: number; // rupees
  food: number;
  travel: number;
  /** [label, percent] rows; the percents add up to 100. */
  legend: [string, number][];
  /** e.g. "SEP 2026" */
  period: string;
}

type Rng = () => number;

function between(rng: Rng, min: number, max: number, step = 1): number {
  return Math.round((min + rng() * (max - min)) / step) * step;
}

export function mastheadSample(rng: Rng = Math.random, now: Date = new Date()): MastheadSample {
  const bills = between(rng, 1800, 3800, 10);
  const food = between(rng, 5200, 8800, 10);
  const travel = between(rng, 10500, 15500, 50);

  let expenses: number, fixed: number, savings: number, others: number;
  do {
    expenses = between(rng, 55, 70);
    fixed = between(rng, 12, 22);
    savings = between(rng, 6, 16);
    others = 100 - expenses - fixed - savings;
  } while (others < 3);

  // Any month from this one back to two years ago.
  const { year, month } = zonedParts(addMonthsToDate(now, -between(rng, 0, 23)));
  return {
    bills,
    food,
    travel,
    legend: [
      ["Expenses", expenses],
      ["Fixed bills", fixed],
      ["Savings", savings],
      ["Others", others],
    ],
    period: `${monthName(month, true).toUpperCase()} ${year}`,
  };
}
