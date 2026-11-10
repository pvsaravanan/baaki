import { describe, expect, it } from "vitest";
import {
  advancedFilterCount,
  datePresets,
  EMPTY_FILTERS,
  hasCustomDates,
  matchingPreset,
  monthDates,
  visibleWithSelected,
  wholeMonth,
} from "./transaction-filters";
import { fromISODate } from "./dates";

const now = fromISODate("2026-03-15")!;

describe("datePresets", () => {
  it("covers whole calendar months, across a year boundary and a short February", () => {
    expect(datePresets(now)).toEqual([
      { label: "This month", start: "2026-03-01", end: "2026-03-31" },
      { label: "Last month", start: "2026-02-01", end: "2026-02-28" },
      { label: "Last 3 months", start: "2026-01-01", end: "2026-03-31" },
      { label: "Last 6 months", start: "2025-10-01", end: "2026-03-31" },
    ]);
    expect(datePresets(fromISODate("2026-01-10")!)[1]).toMatchObject({ start: "2025-12-01", end: "2025-12-31" });
  });
});

describe("custom dates", () => {
  it("tells a preset from a range picked by hand", () => {
    expect(matchingPreset({ start: "2026-03-01", end: "2026-03-31" }, now)?.label).toBe("This month");
    expect(hasCustomDates({ start: "2026-03-01", end: "2026-03-31" }, now)).toBe(false);
    expect(hasCustomDates({ start: "2026-03-02", end: "" }, now)).toBe(true);
    expect(hasCustomDates({ start: "", end: "" }, now)).toBe(false);
  });

  it("counts them among the advanced filters, but not a preset", () => {
    expect(advancedFilterCount({ ...EMPTY_FILTERS, start: "2026-03-01", end: "2026-03-31", categoryId: "c" }, now)).toBe(0);
    expect(advancedFilterCount({ ...EMPTY_FILTERS, start: "2026-03-02", min: "10", recurring: "1" }, now)).toBe(3);
  });
});

describe("a chosen month", () => {
  it("covers the whole month, and is told apart from a range picked by hand", () => {
    expect(monthDates({ year: 2024, month: 2 })).toEqual({ start: "2024-02-01", end: "2024-02-29" });
    expect(wholeMonth({ start: "2025-11-01", end: "2025-11-30" })).toEqual({ year: 2025, month: 11 });
    expect(wholeMonth({ start: "2025-11-01", end: "2025-11-29" })).toBeNull();
    expect(wholeMonth({ start: "2025-11-02", end: "2025-11-30" })).toBeNull();
    // A chosen month is a main filter, not an advanced one.
    expect(hasCustomDates({ start: "2025-11-01", end: "2025-11-30" }, now)).toBe(false);
  });
});

describe("visibleWithSelected", () => {
  const items = ["a", "b", "c", "d"].map((id) => ({ id }));

  it("keeps a selected item past the limit on show", () => {
    expect(visibleWithSelected(items, 2, "d").map((i) => i.id)).toEqual(["a", "d"]);
  });

  it("leaves the list alone otherwise", () => {
    expect(visibleWithSelected(items, 2, "b").map((i) => i.id)).toEqual(["a", "b"]);
    expect(visibleWithSelected(items, 2, "").map((i) => i.id)).toEqual(["a", "b"]);
  });
});
