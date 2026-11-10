import { describe, expect, it } from "vitest";
import { displayAmount, displayExpression, evaluateAmount, pressAmountKey, type AmountKey } from "./amount-keypad";

const press = (keys: AmountKey[], start = "") => keys.reduce(pressAmountKey, start);

describe("pressAmountKey", () => {
  it("builds an amount digit by digit", () => {
    expect(press(["4", "2", "0"])).toBe("420");
  });

  it("replaces a lone zero instead of leading with it", () => {
    expect(press(["0", "5"])).toBe("5");
  });

  it("starts a decimal with a zero and allows only one dot", () => {
    expect(press(["."])).toBe("0.");
    expect(press(["1", ".", "5", "."])).toBe("1.5");
  });

  it("stops at two decimals", () => {
    expect(press(["1", ".", "2", "5", "9"])).toBe("1.25");
  });

  it("removes the last character, and does nothing when empty", () => {
    expect(press(["1", ".", "backspace"])).toBe("1");
    expect(press(["backspace"])).toBe("");
  });

  it("won't go past the largest amount the app stores", () => {
    expect(pressAmountKey("10000000", "0")).toBe("10000000");
    expect(pressAmountKey("10000000.", "1")).toBe("10000000.");
  });
});

describe("pressAmountKey with operators", () => {
  it("needs a number to start from", () => {
    expect(press(["+"])).toBe("");
  });

  it("replaces an operator pressed straight after another", () => {
    expect(press(["5", "+", "×"])).toBe("5×");
  });

  it("drops a dangling dot before an operator", () => {
    expect(press(["5", ".", "+"])).toBe("5+");
  });

  it("applies the number rules to each number on its own", () => {
    expect(press(["1", ".", "5", "+", "2", ".", "2", "5", "9", "."])).toBe("1.5+2.25");
    expect(press(["5", "+", "0", "7"])).toBe("5+7");
    expect(press(["5", "+", "."])).toBe("5+0.");
    expect(pressAmountKey("5+10000000", "0")).toBe("5+10000000");
  });

  it("removes one character at a time, operators included", () => {
    expect(press(["5", "+", "backspace"])).toBe("5");
  });

  it("stops growing a very long sum, but can still delete from it", () => {
    const long = "1+".repeat(20);
    expect(pressAmountKey(long, "1")).toBe(long);
    expect(pressAmountKey(long, "backspace")).toBe(long.slice(0, -1));
  });
});

describe("evaluateAmount", () => {
  const paise = (expression: string) => evaluateAmount(expression).paise;

  it("reads a plain number and an empty amount", () => {
    expect(evaluateAmount("")).toEqual({ paise: 0, problem: null });
    expect(paise("420")).toBe(42_000);
    expect(paise("12.")).toBe(1_200);
  });

  it("does all four operations", () => {
    expect(paise("120+30")).toBe(15_000);
    expect(paise("120−30")).toBe(9_000);
    expect(paise("120×3")).toBe(36_000);
    expect(paise("120÷3")).toBe(4_000);
  });

  it("does × and ÷ before + and −", () => {
    expect(paise("2+3×4")).toBe(1_400);
    expect(paise("20−10÷5")).toBe(1_800);
    expect(paise("10−2−3")).toBe(500);
  });

  it("ignores a trailing operator while the next number is typed", () => {
    expect(paise("12+")).toBe(1_200);
    expect(paise("2+3×")).toBe(500);
  });

  it("stays exact to the paisa with decimals", () => {
    expect(paise("0.1+0.2")).toBe(30);
    expect(paise("12.50×3")).toBe(3_750);
    expect(paise("19.99×3")).toBe(5_997);
    expect(paise("0.67×1.5")).toBe(101);
  });

  it("rounds to the paisa only at the end", () => {
    expect(paise("100÷3")).toBe(3_333);
    expect(paise("100÷3×3")).toBe(10_000);
  });

  it("reports what can't be saved", () => {
    expect(evaluateAmount("10÷0")).toEqual({ paise: 0, problem: "divide-by-zero" });
    expect(evaluateAmount("10÷0.")).toEqual({ paise: 0, problem: "divide-by-zero" });
    expect(evaluateAmount("10−20")).toEqual({ paise: -1_000, problem: "negative" });
    expect(evaluateAmount("10000000+1")).toEqual({ paise: 0, problem: "too-large" });
    expect(evaluateAmount("10000000×10000000×10000000").problem).toBe("too-large");
  });

  it("treats a sum of exactly the largest amount, or of zero, as no problem", () => {
    expect(evaluateAmount("5000000+5000000")).toEqual({ paise: 1_000_000_000, problem: null });
    expect(evaluateAmount("5−5")).toEqual({ paise: 0, problem: null });
  });
});

describe("displayExpression", () => {
  it("groups each number and spaces the operators", () => {
    expect(displayExpression("1200+30×")).toBe("1,200 + 30 ×");
    expect(displayExpression("120000.5−0.")).toBe("1,20,000.5 − 0.");
  });
});

describe("displayAmount", () => {
  it("groups the Indian way and keeps what was typed after the dot", () => {
    expect(displayAmount("")).toBe("0");
    expect(displayAmount("420")).toBe("420");
    expect(displayAmount("120000.5")).toBe("1,20,000.5");
    expect(displayAmount("12.")).toBe("12.");
  });
});
