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

  it("rounds to the nearest rupee when paise aren't shown, instead of cutting them off", () => {
    expect(formatINR(6091875, { decimals: "never" })).toBe("₹60,919"); // ₹60,918.75
    expect(formatINR(4208125, { decimals: "never" })).toBe("₹42,081"); // ₹42,081.25
    expect(formatINR(4950, { decimals: "never" })).toBe("₹50"); // ₹49.50 rounds up
    expect(formatINR(4949, { decimals: "never" })).toBe("₹49");
    expect(formatINR(99, { decimals: "never" })).toBe("₹1"); // ₹0.99
    expect(formatINR(49, { decimals: "never" })).toBe("₹0");
    expect(formatINR(-6091875, { decimals: "never" })).toBe("−₹60,919");
    expect(formatINR(-49, { decimals: "never" })).toBe("₹0"); // never −₹0
    expect(formatINR(-50, { decimals: "never" })).toBe("−₹1");
    expect(formatINR(6091875, { decimals: "never", showSign: true })).toBe("+₹60,919");
    // Other modes are unchanged.
    expect(formatINR(6091875)).toBe("₹60,918.75");
    expect(formatINR(6091875, { decimals: "always" })).toBe("₹60,918.75");
  });

  it("formats compact amounts", () => {
    expect(formatINRCompact(10000000)).toBe("₹1L");
    expect(formatINRCompact(150000000)).toBe("₹15L");
    expect(formatINRCompact(950000)).toBe("₹9.5k");
  });
});

describe("zero is never negative", () => {
  it("has no −0 paise and no −₹0", async () => {
    const { toPaise, formatINR } = await import("./money");
    expect(Object.is(toPaise("-0.001"), 0)).toBe(true);
    expect(formatINR(-0.4)).toBe("₹0");
    expect(formatINR(-150)).toBe("−₹1.50");
  });
});
