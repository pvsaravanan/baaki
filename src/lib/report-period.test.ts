import { describe, expect, it } from "vitest";
import type { CalcTxn } from "./calculations";
import { fromISODate, toISODate } from "./dates";
import {
  categorySlices,
  monthPeriod,
  parseReportPeriod,
  periodLabel,
  periodRanges,
  rangePeriod,
  shareLabel,
  spendingInsight,
  spendingTrend,
} from "./report-period";

const at = (iso: string) => fromISODate(iso)!;
const NOW = new Date(at("2026-11-06").getTime() + 12 * 3_600_000);
const spend = (date: string, amount: number, categoryId: string | null = "food"): CalcTxn => ({
  type: "expense", amount, date: at(date), categoryId, accountId: "a",
});
const days = (r: { start: Date; end: Date; previousStart: Date; previousEnd: Date }) =>
  [r.start, r.end, r.previousStart, r.previousEnd].map(toISODate);

describe("parseReportPeriod", () => {
  it("falls back to this month", () => {
    expect(parseReportPeriod("this-year")).toBe("this-year");
    expect(parseReportPeriod("nonsense")).toBe("this-month");
    expect(parseReportPeriod(null)).toBe("this-month");
  });
});

describe("chosen months", () => {
  it("parses a chosen month and span, and rejects what can't be shown", () => {
    expect(parseReportPeriod("last-6-months", NOW)).toBe("last-6-months");
    expect(parseReportPeriod("month-2026-03", NOW)).toBe("month-2026-03");
    expect(parseReportPeriod("range-2026-01-2026-06", NOW)).toBe("range-2026-01-2026-06");
    // A one-month span is just that month.
    expect(parseReportPeriod("range-2026-04-2026-04", NOW)).toBe("month-2026-04");
    expect(parseReportPeriod("month-2026-13", NOW)).toBe("this-month");
    expect(parseReportPeriod("month-2026-12", NOW)).toBe("this-month"); // still to come
    expect(parseReportPeriod("range-2026-06-2026-01", NOW)).toBe("this-month"); // backwards
    expect(parseReportPeriod("range-2023-01-2026-01", NOW)).toBe("this-month"); // over 24 months
  });

  it("builds and labels them", () => {
    expect(monthPeriod({ year: 2026, month: 3 })).toBe("month-2026-03");
    expect(rangePeriod({ year: 2025, month: 11 }, { year: 2026, month: 2 })).toBe("range-2025-11-2026-02");
    expect(periodLabel("month-2026-03")).toBe("Mar 2026");
    expect(periodLabel("range-2026-01-2026-06")).toBe("Jan – Jun 2026");
    expect(periodLabel("range-2025-11-2026-02")).toBe("Nov 2025 – Feb 2026");
    expect(periodLabel("last-6-months")).toBe("Last 6 Months");
  });
});

describe("periodRanges", () => {
  it("covers six months including this one", () => {
    const r = periodRanges("last-6-months", NOW);
    expect(days(r)).toEqual(["2026-06-01", "2026-12-01", "2025-12-01", "2026-05-07"]);
    expect(r.months.map((m) => m.month)).toEqual([6, 7, 8, 9, 10, 11]);
    expect(r.comparedWith).toBe("the 6 months before");
  });

  it("compares a chosen month with the whole month before", () => {
    const r = periodRanges("month-2026-03", NOW);
    expect(days(r)).toEqual(["2026-03-01", "2026-04-01", "2026-02-01", "2026-03-01"]);
    expect(r.comparedWith).toBe("the month before");
  });

  it("treats this month, when chosen, as in progress", () => {
    expect(days(periodRanges("month-2026-11", NOW))).toEqual(days(periodRanges("this-month", NOW)));
  });

  it("compares a chosen span with as many months just before it", () => {
    const r = periodRanges("range-2026-01-2026-04", NOW);
    expect(days(r)).toEqual(["2026-01-01", "2026-05-01", "2025-09-01", "2026-01-01"]);
    expect(r.months).toHaveLength(4);
    expect(r.comparedWith).toBe("the 4 months before");
  });

  it("compares a span up to this month only as far as it has got", () => {
    const r = periodRanges("range-2026-09-2026-11", NOW);
    expect(days(r)).toEqual(days(periodRanges("last-3-months", NOW)));
  });

  it("compares a month in progress only as far as it has got", () => {
    expect(days(periodRanges("this-month", NOW))).toEqual(["2026-11-01", "2026-12-01", "2026-10-01", "2026-10-07"]);
  });

  it("compares a finished month with the whole month before", () => {
    expect(days(periodRanges("last-month", NOW))).toEqual(["2026-10-01", "2026-11-01", "2026-09-01", "2026-10-01"]);
  });

  it("covers three months including this one", () => {
    const r = periodRanges("last-3-months", NOW);
    expect(days(r)).toEqual(["2026-09-01", "2026-12-01", "2026-06-01", "2026-08-07"]);
    expect(r.months.map((m) => m.month)).toEqual([9, 10, 11]);
  });

  it("compares this year with the same days last year", () => {
    const r = periodRanges("this-year", NOW);
    expect(days(r)).toEqual(["2026-01-01", "2026-12-01", "2025-01-01", "2025-11-07"]);
    expect(r.months).toHaveLength(11);
  });

  it("copes with a day the previous month doesn't have", () => {
    const march31 = new Date(at("2026-03-31").getTime() + 3_600_000);
    expect(toISODate(periodRanges("this-month", march31).previousEnd)).toBe("2026-03-01");
  });

  it("crosses the start of a year", () => {
    const january = new Date(at("2026-01-15").getTime() + 3_600_000);
    expect(days(periodRanges("last-month", january)).slice(0, 2)).toEqual(["2025-12-01", "2026-01-01"]);
    expect(toISODate(periodRanges("last-3-months", january).start)).toBe("2025-11-01");
  });
});

describe("spendingTrend", () => {
  it("shows six months ending with the period, marking the period", () => {
    const trend = spendingTrend([spend("2026-11-02", 500), spend("2026-07-10", 300)], periodRanges("this-month", NOW).months);
    expect(trend.map((p) => p.label)).toEqual(["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"]);
    expect(trend.map((p) => p.value)).toEqual([0, 300, 0, 0, 0, 500]);
    expect(trend.filter((p) => p.inPeriod).map((p) => p.label)).toEqual(["Nov"]);
  });

  it("ends at last month when that's the period", () => {
    const trend = spendingTrend([], periodRanges("last-month", NOW).months);
    expect(trend[trend.length - 1]).toEqual({ label: "Oct", value: 0, inPeriod: true });
  });

  it("shows every month of a longer period", () => {
    const trend = spendingTrend([], periodRanges("this-year", NOW).months);
    expect(trend.map((p) => p.label)[0]).toBe("Jan");
    expect(trend).toHaveLength(11);
    expect(trend.every((p) => p.inPeriod)).toBe(true);
  });
});

describe("categorySlices", () => {
  const row = (name: string, net: number) => ({ categoryId: name, name, color: "#000", net });

  it("folds everything past the top four into Others", () => {
    const slices = categorySlices([row("a", 50), row("b", 40), row("c", 30), row("d", 20), row("e", 10), row("f", 5)]);
    expect(slices.map((s) => [s.name, s.amount])).toEqual([["a", 50], ["b", 40], ["c", 30], ["d", 20], ["Others", 15]]);
  });

  it("keeps a single leftover category under its own name", () => {
    const slices = categorySlices([row("a", 50), row("b", 40), row("c", 30), row("d", 20), row("e", 10)]);
    expect(slices.map((s) => s.name)).toEqual(["a", "b", "c", "d", "e"]);
  });
});

describe("shareLabel", () => {
  it("rounds, and never calls a real amount 0%", () => {
    expect(shareLabel(21, 100)).toBe("21%");
    expect(shareLabel(1, 1000)).toBe("<1%");
    expect(shareLabel(0, 100)).toBe("0%");
    expect(shareLabel(5, 0)).toBe("—");
  });
});

describe("spendingInsight", () => {
  const top = { categoryId: "food", name: "Food", net: 2_160 };

  it("says how the biggest category moved", () => {
    expect(spendingInsight(top, 10_000, [spend("2026-10-02", 2_000)], "last time")?.message).toBe("You spent 22% on Food, 8% higher than last time.");
    expect(spendingInsight(top, 10_000, [spend("2026-10-02", 2_400)], "last time")?.message).toBe("You spent 22% on Food, 10% lower than last time.");
    expect(spendingInsight(top, 10_000, [spend("2026-10-02", 2_160)], "last time")?.message).toBe("You spent 22% on Food, in line with last time.");
  });

  it("makes no comparison when there's nothing to compare with", () => {
    expect(spendingInsight(top, 10_000, [], "last time")?.message).toBe("You spent 22% on Food.");
    expect(spendingInsight(top, 10_000, [spend("2026-10-02", 500, "travel")], "last time")?.message).toBe("You spent 22% on Food.");
  });

  it("has nothing to say when nothing was spent", () => {
    expect(spendingInsight(undefined, 0, [], "last time")).toBeNull();
  });
});
