import { describe, expect, it } from "vitest";
import { trailingIncreaseStreak } from "./insights";

describe("insights streak", () => {
  it("counts consecutive rising months", () => {
    expect(trailingIncreaseStreak([100, 200, 300])).toBe(3);
    expect(trailingIncreaseStreak([300, 100, 200, 300])).toBe(3);
    expect(trailingIncreaseStreak([100, 200, 150])).toBe(0);
    expect(trailingIncreaseStreak([100])).toBe(0);
  });
});
