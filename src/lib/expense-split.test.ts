import { describe, expect, it } from "vitest";
import { calculateExpenseSplit, type ExpenseSplitMethod } from "./expense-split";

describe("expense split methods", () => {
  it("splits evenly including the person who paid", () => {
    expect(calculateExpenseSplit(90000, "equal", ["", ""]).amounts).toEqual([30000, 30000, 30000]);
  });

  it("distributes equal-split remainders one paisa at a time", () => {
    expect(calculateExpenseSplit(10000, "equal", ["", ""]).amounts).toEqual([3334, 3333, 3333]);
    expect(calculateExpenseSplit(10001, "equal", ["", ""]).amounts).toEqual([3334, 3334, 3333]);
  });

  it("keeps explicit amounts exact and assigns the remainder to you", () => {
    expect(calculateExpenseSplit(100000, "amounts", ["200.25", "300"]).amounts).toEqual([49975, 20025, 30000]);
  });

  it("allows amounts to allocate the whole expense to others", () => {
    expect(calculateExpenseSplit(10000, "amounts", ["100"]).amounts).toEqual([0, 10000]);
  });

  it("rejects amounts greater than the expense", () => {
    expect(calculateExpenseSplit(10000, "amounts", ["60", "40.01"]).error).toMatch(/exceed/i);
  });

  it("splits by relative shares including your editable weight", () => {
    expect(calculateExpenseSplit(120000, "shares", ["2", "1"], "1").amounts).toEqual([30000, 60000, 30000]);
    expect(calculateExpenseSplit(120000, "shares", ["1", "1"], "2").amounts).toEqual([60000, 30000, 30000]);
  });

  it("supports fractional weights and a zero share for the payer", () => {
    expect(calculateExpenseSplit(10000, "shares", ["1.5"], "0.5").amounts).toEqual([2500, 7500]);
    expect(calculateExpenseSplit(10000, "shares", ["1"], "0").amounts).toEqual([0, 10000]);
  });

  it("rejects all-zero weights", () => {
    expect(calculateExpenseSplit(10000, "shares", ["0"], "0").error).toMatch(/greater than zero/i);
  });

  it("keeps weighted allocation exact even for large products", () => {
    const result = calculateExpenseSplit(10000000000, "shares", ["9999999.99", "9999999.98"], "9999999.97");
    expect(result.error).toBeNull();
    expect(result.amounts.every(Number.isSafeInteger)).toBe(true);
    expect(result.amounts.reduce((sum, amount) => sum + amount, 0)).toBe(10000000000);
  });

  it("splits by percentages with the remaining percentage assigned to you", () => {
    const result = calculateExpenseSplit(100000, "percent", ["25", "35.50"]);
    expect(result.amounts).toEqual([39500, 25000, 35500]);
    expect(result.yourPercentage).toBe(39.5);
  });

  it("never over-allocates when percentage amounts round to fractions of a paisa", () => {
    const result = calculateExpenseSplit(1, "percent", ["50", "50"]);
    expect(result.amounts).toEqual([0, 1, 0]);
    expect(result.error).toBeNull();
  });

  it("rejects percentages above 100 even for tiny expenses", () => {
    expect(calculateExpenseSplit(1, "percent", ["60", "60"]).error).toMatch(/100/);
    expect(calculateExpenseSplit(10000, "percent", ["100.01"]).error).toMatch(/100/);
  });

  it.each<ExpenseSplitMethod>(["amounts", "percent", "shares"])("rejects malformed inputs in %s mode", (method) => {
    for (const value of ["", "-1", "NaN", "Infinity", "1e2", "1.2.3", "0.001", "9007199254740992"]) {
      expect(calculateExpenseSplit(10000, method, [value]).error, value).toBeTruthy();
    }
  });

  it("validates your own weight", () => {
    expect(calculateExpenseSplit(10000, "shares", ["1"], "").error).toBeTruthy();
    expect(calculateExpenseSplit(10000, "shares", ["1"], "-1").error).toBeTruthy();
  });

  it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])("rejects invalid totals: %s", (total) => {
    expect(calculateExpenseSplit(total, "equal", [""]).error).toBeTruthy();
  });

  it("requires between one and twenty other people", () => {
    expect(calculateExpenseSplit(10000, "equal", []).error).toBeTruthy();
    expect(calculateExpenseSplit(10000, "equal", Array(21).fill("")).error).toBeTruthy();
    expect(calculateExpenseSplit(10000, "equal", Array(20).fill("")).error).toBeNull();
  });

  it.each<ExpenseSplitMethod>(["equal", "percent", "shares"])("always conserves paise in %s mode", (method) => {
    const values = method === "percent" ? ["33.33", "33.33"] : ["1", "1"];
    for (const total of [1, 2, 3, 7, 100, 101, 99999, 1000000000]) {
      const result = calculateExpenseSplit(total, method, values);
      expect(result.error).toBeNull();
      expect(result.amounts.every((amount) => Number.isSafeInteger(amount) && amount >= 0)).toBe(true);
      expect(result.amounts.reduce((sum, amount) => sum + amount, 0)).toBe(total);
    }
  });
});
