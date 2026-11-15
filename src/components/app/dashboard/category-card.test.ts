import { describe, expect, it } from "vitest";
import { ringAmountFontSize } from "./category-card";

describe("ringAmountFontSize", () => {
  const widthPercent = (css: string) => Number(/, ([\d.]+)cqi\)/.exec(css)![1]);

  it("keeps a short total at the largest size", () => {
    // ₹5,609 is 6 characters: 62 / (6 * 0.58) is about 17.8% of the ring, so the 15px cap wins on a normal ring.
    expect(ringAmountFontSize(6, "15px")).toBe("min(15px, 17.82cqi)");
  });

  it("makes a longer total smaller, so it always fits the hole", () => {
    expect(widthPercent(ringAmountFontSize(9, "15px"))).toBeLessThan(widthPercent(ringAmountFontSize(6, "15px")));
    expect(widthPercent(ringAmountFontSize(12, "15px"))).toBeLessThan(widthPercent(ringAmountFontSize(9, "15px")));
  });

  it("never leaves the text wider than the hole", () => {
    // characters * 0.58em wide at (62 / (characters * 0.58))% of the ring is 62% of the ring, whatever the length.
    for (const n of [5, 7, 9, 11, 14]) expect(widthPercent(ringAmountFontSize(n, "15px")) * n * 0.58).toBeCloseTo(62, 0);
  });
});
