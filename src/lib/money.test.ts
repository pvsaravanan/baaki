import { describe, expect, it } from "vitest";
import { formatINR, formatINRCompact, groupIndian, toPaise, toRupees } from "./money";

describe("money", () => {
  it("converts rupees to paise without float error", () => {
    expect(toPaise(1250)).toBe(125000);
    expect(toPaise("1,250")).toBe(125000);
    expect(toPaise("₹1,00,000")).toBe(10000000);
    expect(toPaise(19.99)).toBe(1999);
    expect(toRupees(125000)).toBe(1250);
  });

  it("groups using the Indian numbering system", () => {
    expect(groupIndian(1000)).toBe("1,000");
    expect(groupIndian(100000)).toBe("1,00,000");
    expect(groupIndian(10000000)).toBe("1,00,00,000");
  });

  it("formats INR with sign and paise handling", () => {
    expect(formatINR(4258000)).toBe("₹42,580");
    expect(formatINR(125050)).toBe("₹1,250.50");
    expect(formatINR(-31420_00)).toBe("−₹31,420");
    expect(formatINR(500000, { showSign: true })).toBe("+₹5,000");
  });

  it("formats compact amounts", () => {
    expect(formatINRCompact(10000000)).toBe("₹1L");
    expect(formatINRCompact(150000000)).toBe("₹15L");
    expect(formatINRCompact(950000)).toBe("₹9.5k");
  });
});
