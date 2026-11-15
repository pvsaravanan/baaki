import { describe, expect, it } from "vitest";
import { equalShare, isEqualSplit, shareAmounts, yourShare } from "./split";

describe("splitting an expense", () => {
  it("divides equally between the people and you, keeping leftover paise for you", () => {
    // ₹1,000 three ways: ₹333.33 each, and you keep the extra paisa.
    expect(equalShare(100000, 2)).toBe(33333);
    expect(yourShare(100000, shareAmounts("equal", 100000, [0, 0]))).toBe(33334);
  });

  it("uses the typed amounts for a custom split", () => {
    expect(shareAmounts("custom", 100000, [20000, 50000])).toEqual([20000, 50000]);
    expect(yourShare(100000, [20000, 50000])).toBe(30000);
  });

  it("shows a negative share for you when the others add up to more", () => {
    expect(yourShare(1000, [600, 500])).toBe(-100);
  });

  it("gives nothing to share when there's nobody or nothing", () => {
    expect(equalShare(100000, 0)).toBe(0);
    expect(equalShare(0, 3)).toBe(0);
  });

  it("recognises a saved equal split", () => {
    expect(isEqualSplit(100000, [33333, 33333])).toBe(true);
    expect(isEqualSplit(100000, [20000, 50000])).toBe(false);
  });
});
