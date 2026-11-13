import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SpendingCalendar } from "./spending-calendar";

type Day = { date: string; expense: number; income?: number; count?: number };
const SEP = { year: 2020, month: 9 }; // wholly in the past, so every day has happened

function render(daily: Day[], monthKey = SEP) {
  return renderToStaticMarkup(createElement(SpendingCalendar, { monthKey, daily }));
}

describe("spending calendar", () => {
  it("summarises the month: spent, daily average and busiest day", () => {
    const html = render([
      { date: "2020-09-05", expense: 300_000 },
      { date: "2020-09-12", expense: 90_000 },
    ]);
    expect(html).toContain("₹3.9k"); // 3,900 spent
    expect(html).toContain("₹130"); // 3,900 / 30 days
    expect(html).toContain("5 Sep"); // busiest
  });

  it("opens on the busiest day in a past month, with its exact total and comparison", () => {
    const html = render([
      { date: "2020-09-05", expense: 125_050, count: 2, income: 50_000 },
      { date: "2020-09-12", expense: 10_000 },
    ]);
    expect(html).toContain("Saturday, 5 Sep");
    expect(html).toContain("₹1,250.50");
    expect(html).toContain("2 transactions");
    expect(html).toContain("+₹500 in");
    expect(html).toMatch(/\d\.\d× your daily average/);
  });

  it("sizes bubbles by spend: the busiest day is the largest (still inside its cell), quiet days are smaller, empty days have none", () => {
    const html = render([
      { date: "2020-09-05", expense: 400_000 },
      { date: "2020-09-12", expense: 4_000 },
    ]);
    const widths = [...html.matchAll(/style="width:([\d.]+)%/g)].map((m) => Number(m[1]));
    expect(widths).toHaveLength(2);
    expect(Math.max(...widths)).toBeCloseTo(76, 0);
    expect(Math.min(...widths)).toBeLessThan(60);
  });

  it("never prints a rupee amount on days with nothing spent", () => {
    const html = render([]);
    expect(html).not.toContain("₹0</span>");
    expect(html).toContain("No spending this month yet.");
    expect(html.match(/no spending"/g)).toHaveLength(30);
  });

  it("keeps entries from other months out", () => {
    const html = render([
      { date: "2020-09-18", expense: 45_000 },
      { date: "2020-08-18", expense: 990_000 },
    ]);
    expect(html).toContain("₹450");
    expect(html).not.toContain("₹9.9k");
  });

  it("makes future days non-interactive and past days interactive", () => {
    const disabled = (html: string) => (html.match(/<button[^>]*disabled=""/g) ?? []).length;
    expect(disabled(render([], { year: 2099, month: 1 }))).toBe(31);
    expect(disabled(render([], { year: 2020, month: 1 }))).toBe(0);
  });

  it("gives each day an accessible label with the exact amount", () => {
    const html = render([{ date: "2020-09-26", expense: 46_667 }]);
    expect(html).toContain('aria-label="26 Sep: ₹466.67 spent"');
    expect(html).toContain('aria-label="1 Sep: no spending"');
  });

  it("renders every date of a leap-year February", () => {
    const html = render([], { year: 2024, month: 2 });
    expect(html.match(/aria-label="\d+ Feb:/g)).toHaveLength(29);
  });
});
