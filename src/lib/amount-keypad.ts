import { MAX_PAISE } from "./constants";
import { formatINR, groupIndian, toPaise } from "./money";

export const OPERATORS = ["+", "−", "×", "÷"] as const;
export type AmountOperator = (typeof OPERATORS)[number];
export type AmountKey = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "." | "backspace" | "=" | AmountOperator;

/** Keeps a sum short enough to read on one or two lines. */
const MAX_LENGTH = 40;
const OPERATOR = /[+−×÷]/;
const TOKENS = /([+−×÷])/;

const endsWithOperator = (expression: string) => OPERATOR.test(expression.slice(-1));

/**
 * The expression after pressing a keypad key. A key that would make it invalid
 * (a second dot in a number, a third decimal, a number larger than the app can
 * store) leaves it unchanged. A second operator in a row replaces the first.
 * "=" works the sum out and leaves just the result, to carry on from.
 */
export function pressAmountKey(expression: string, key: AmountKey): string {
  if (key === "backspace") return expression.slice(0, -1);
  if (key === "=") return solveAmount(expression);
  if (expression.length >= MAX_LENGTH) return expression;

  if ((OPERATORS as readonly string[]).includes(key)) {
    if (expression === "") return expression;
    const base = endsWithOperator(expression) ? expression.slice(0, -1) : expression.replace(/\.$/, "");
    return base + key;
  }

  const number = expression.split(OPERATOR).pop() ?? "";
  const before = expression.slice(0, expression.length - number.length);
  if (key === ".") {
    if (number.includes(".")) return expression;
    return `${before}${number === "" ? "0." : `${number}.`}`;
  }
  const decimals = number.split(".")[1];
  if (decimals !== undefined && decimals.length >= 2) return expression;
  const next = number === "0" ? key : number + key;
  return toPaise(next) > MAX_PAISE ? expression : before + next;
}

/**
 * A sum's result as a plain number to type on from ("178", "178.5", "178.05"),
 * or the sum itself when there is nothing to work out or it has no result
 * (divide by zero, below ₹0, too large: the problem stays on show).
 */
function solveAmount(expression: string): string {
  if (!hasOperator(expression)) return expression;
  const { paise, problem } = evaluateAmount(expression);
  if (problem) return expression;
  const rupees = Math.floor(paise / 100);
  const rest = paise % 100;
  return rest === 0 ? String(rupees) : `${rupees}.${String(rest).padStart(2, "0").replace(/0$/, "")}`;
}

export function hasOperator(expression: string): boolean {
  return OPERATOR.test(expression);
}

export type AmountProblem = "divide-by-zero" | "negative" | "too-large";

/**
 * What the expression comes to, in paise, with × and ÷ before + and −. A
 * trailing operator is ignored, so "12+" is 12 while the next number is typed.
 * `paise` is above 0 only when the result can be saved.
 */
export function evaluateAmount(expression: string): { paise: number; problem: AmountProblem | null } {
  const tokens = expression.split(TOKENS);
  if (tokens[tokens.length - 1] === "") tokens.splice(-2);
  if (tokens.length === 0) return { paise: 0, problem: null };

  // Rounded once, at the end: an early rounding would make 100 ÷ 3 × 3 come to ₹99.99.
  let total = 0;
  let sign = 1;
  let term = toPaise(tokens[0]);
  for (let i = 1; i < tokens.length; i += 2) {
    const value = toPaise(tokens[i + 1]);
    switch (tokens[i]) {
      case "×":
        term = (term * value) / 100;
        break;
      case "÷":
        if (value === 0) return { paise: 0, problem: "divide-by-zero" };
        term = (term * 100) / value;
        break;
      default:
        total += sign * term;
        sign = tokens[i] === "+" ? 1 : -1;
        term = value;
    }
  }
  const paise = Math.round(total + sign * term);
  if (paise > MAX_PAISE) return { paise: 0, problem: "too-large" };
  if (paise < 0) return { paise, problem: "negative" };
  return { paise, problem: null };
}

/** Why an expression can't be saved, in a sentence. */
export function amountProblemMessage(problem: AmountProblem): string {
  if (problem === "divide-by-zero") return "Can't divide by 0";
  if (problem === "negative") return "The amount can't be below ₹0";
  return `The amount can't be more than ${formatINR(MAX_PAISE)}`;
}

/** A number as typed, with Indian digit grouping: "120000.5" -> "1,20,000.5". */
export function displayAmount(amount: string): string {
  const [rupees, decimals] = amount.split(".");
  const grouped = groupIndian(Number(rupees || "0"));
  return decimals === undefined ? grouped : `${grouped}.${decimals}`;
}

/** A sum to read: "1200+30×" -> "1,200 + 30 ×". */
export function displayExpression(expression: string): string {
  return expression
    .split(TOKENS)
    .filter(Boolean)
    .map((token) => (OPERATOR.test(token) ? token : displayAmount(token)))
    .join(" ");
}
