import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { dailySeries, DistributionTiles, lastSixMonths, type ReportsAnalytics } from "./shared";

const days = (dates: string[]) =>
  ({ daily: dates.map((date, i) => ({ date, expense: (i + 1) * 100, income: 0, count: 1 })) }) as unknown as ReportsAnalytics;

describe("daily chart labels", () => {
  it("are day numbers within one month", () => {
    expect(dailySeries(days(["2026-09-01", "2026-09-02"]), "expense")).toEqual([
      { label: "1", value: 100 },
      { label: "2", value: 200 },
    ]);
  });

  it("carry the month once the range runs past a month", () => {
    const range = Array.from({ length: 40 }, (_, i) => new Date(Date.UTC(2026, 8, 1 + i)).toISOString().slice(0, 10));
    const labels = dailySeries(days(range), "expense").map((d) => d.label);
    expect(labels[0]).toBe("Sep 1");
    expect(labels[39]).toBe("Oct 10");
  });
});

describe("distribution tiles", () => {
  it("show total, average, highest and lowest", () => {
    const html = renderToStaticMarkup(<DistributionTiles values={[10_000, 30_000, 20_000]} unit="month" />);
    expect(html).toContain("across 3 months");
    for (const amount of ["₹600", "₹200", "₹300", "₹100"]) expect(html).toContain(amount);
  });

  it("read zero rather than Infinity with nothing to show", () => {
    const html = renderToStaticMarkup(<DistributionTiles values={[]} unit="month" />);
    expect(html).toContain("across 0 months");
    expect(html).not.toContain("Infinity");
  });
});

describe("distribution tiles", () => {
  it("spell the plural of their unit", () => {
    expect(renderToStaticMarkup(<DistributionTiles values={[1, 2]} unit="category" />)).toContain("across 2 categories");
    expect(renderToStaticMarkup(<DistributionTiles values={[1, 2]} unit="month" />)).toContain("across 2 months");
    expect(renderToStaticMarkup(<DistributionTiles values={[1]} unit="category" />)).toContain("across 1 category");
  });
});

describe("lastSixMonths", () => {
  it("keeps the newest six, oldest first, ending with the month being viewed", () => {
    const trend = Array.from({ length: 12 }, (_, i) => ({ label: `m${i + 1}`, month: i + 1, year: 2026, income: 0, expense: 0 }));
    expect(lastSixMonths({ incomeExpenseTrend: trend }).map((m) => m.label)).toEqual(["m7", "m8", "m9", "m10", "m11", "m12"]);
  });
});
