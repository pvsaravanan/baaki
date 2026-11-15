import { describe, expect, it } from "vitest";
import { clampDate, clampMonth, isoDate, leadingBlanks, moveToMonth, yearPageStart } from "./date-picker";

const PAST_ONLY = { max: "2026-11-05" };

describe("date picker calendar", () => {
  it("builds a date from a month and day", () => {
    expect(isoDate({ year: 2026, month: 3 }, 7)).toBe("2026-03-07");
  });

  it("starts each month on the right weekday", () => {
    expect(leadingBlanks({ year: 2026, month: 11 })).toBe(0); // a Sunday
    expect(leadingBlanks({ year: 2026, month: 10 })).toBe(4); // a Thursday
  });

  it("keeps the day when moving to another month, shortening it if needed", () => {
    expect(moveToMonth("2026-10-20", { year: 2026, month: 3 }, PAST_ONLY)).toBe("2026-03-20");
    expect(moveToMonth("2026-10-31", { year: 2026, month: 2 }, PAST_ONLY)).toBe("2026-02-28");
    expect(moveToMonth("2026-10-31", { year: 2024, month: 2 }, PAST_ONLY)).toBe("2024-02-29");
  });

  it("stays within the latest allowed date", () => {
    expect(moveToMonth("2026-10-20", { year: 2026, month: 11 }, PAST_ONLY)).toBe("2026-11-05");
    expect(clampMonth({ year: 2026, month: 12 }, PAST_ONLY)).toEqual({ year: 2026, month: 11 });
    expect(clampMonth({ year: 2025, month: 12 }, PAST_ONLY)).toEqual({ year: 2025, month: 12 });
  });

  it("stays within the earliest allowed date", () => {
    const fromStart = { min: "2026-03-15" };
    expect(moveToMonth("2026-05-02", { year: 2026, month: 3 }, fromStart)).toBe("2026-03-15");
    expect(clampMonth({ year: 2026, month: 1 }, fromStart)).toEqual({ year: 2026, month: 3 });
    expect(clampDate("2026-03-20", fromStart)).toBe("2026-03-20");
  });

  it("leaves dates alone when there are no limits", () => {
    expect(clampDate("2030-01-01", {})).toBe("2030-01-01");
    expect(clampMonth({ year: 2030, month: 1 }, {})).toEqual({ year: 2030, month: 1 });
  });

  it("pages years in twelves", () => {
    expect(yearPageStart(2026)).toBe(2016);
    expect(yearPageStart(2028)).toBe(2028);
  });
});
