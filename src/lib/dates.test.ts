import { describe, expect, it } from "vitest";
import { advanceByFrequency, daysInMonth, fromISODate, isLeapYear, toISODate } from "./dates";

describe("dates", () => {
  it("knows leap years and month lengths", () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2100)).toBe(false);
    expect(isLeapYear(2000)).toBe(true);
    expect(daysInMonth({ year: 2024, month: 2 })).toBe(29);
    expect(daysInMonth({ year: 2026, month: 2 })).toBe(28);
  });

  it("round-trips ISO dates in local time", () => {
    const d = fromISODate("2026-08-11")!;
    expect(toISODate(d)).toBe("2026-08-11");
    expect(fromISODate("2026-13-01")).toBeNull();
    expect(fromISODate("2026-02-30")).toBeNull();
  });

  it("advances by frequency, clamping month-end", () => {
    expect(toISODate(advanceByFrequency(fromISODate("2026-01-31")!, "monthly"))).toBe("2026-02-28");
    expect(toISODate(advanceByFrequency(fromISODate("2026-08-11")!, "weekly"))).toBe("2026-08-18");
    expect(toISODate(advanceByFrequency(fromISODate("2024-02-29")!, "yearly"))).toBe("2025-02-28");
    expect(toISODate(advanceByFrequency(fromISODate("2026-01-15")!, "quarterly"))).toBe("2026-04-15");
  });
});
