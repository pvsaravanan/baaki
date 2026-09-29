import { describe, expect, it } from "vitest";
import { mastheadSample } from "./masthead-sample";

/** A small seeded generator so each run checks many different samples. */
function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

describe("mastheadSample", () => {
  const now = new Date("2026-09-29T12:00:00+05:30");
  const samples = Array.from({ length: 500 }, (_, i) => mastheadSample(seeded(i + 1), now));

  it("keeps the bars rising: Bills < Food < Travel", () => {
    for (const s of samples) {
      expect(s.bills).toBeLessThan(s.food);
      expect(s.food).toBeLessThan(s.travel);
    }
  });

  it("uses tidy amounts in realistic ranges", () => {
    for (const s of samples) {
      expect(s.bills % 10).toBe(0);
      expect(s.bills).toBeGreaterThanOrEqual(1800);
      expect(s.travel).toBeLessThanOrEqual(15500);
    }
  });

  it("has a legend that adds up to 100%", () => {
    for (const s of samples) {
      expect(s.legend.map(([label]) => label)).toEqual(["Expenses", "Fixed bills", "Savings", "Others"]);
      expect(s.legend.reduce((sum, [, pct]) => sum + pct, 0)).toBe(100);
      expect(Math.min(...s.legend.map(([, pct]) => pct))).toBeGreaterThanOrEqual(3);
    }
  });

  it("picks a month within the last two years, written like SEP 2026", () => {
    const allowed = new Set<string>();
    for (let back = 0; back < 24; back++) {
      const d = new Date(2026, 8 - back, 15);
      allowed.add(`${d.toLocaleString("en", { month: "short" }).toUpperCase()} ${d.getFullYear()}`);
    }
    for (const s of samples) expect(allowed).toContain(s.period);
  });

  it("actually varies from load to load", () => {
    expect(new Set(samples.map((s) => `${s.bills}|${s.period}`)).size).toBeGreaterThan(100);
  });
});
