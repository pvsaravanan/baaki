import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SpendingCalendar } from "./spending-calendar";

function render(daily: { date: string; expense: number }[], monthKey = { year: 2026, month: 9 }) {
  return renderToStaticMarkup(createElement(SpendingCalendar, { monthKey, daily }));
}

describe("spending calendar", () => {
  it("shows the spending amount in the cell, not just in the tooltip", () => {
    expect(render([{ date: "2026-09-18", expense: 45000 }])).toMatch(/>₹450<\/span>/);
  });

  it("preserves paise for amounts below a thousand rupees", () => {
    expect(render([{ date: "2026-09-18", expense: 45075 }])).toMatch(/>₹450\.75<\/span>/);
  });

  it("uses compact amounts while retaining the exact accessible total", () => {
    const html = render([{ date: "2026-09-18", expense: 125050 }]);
    expect(html).toMatch(/>₹1\.3k<\/span>/);
    expect(html).toContain("₹1,250.50 spent");
  });

  it("shows zero spending for days without transactions", () => {
    const html = render([]);
    expect(html.match(/>₹0<\/span>/g)).toHaveLength(30);
    expect(html).toContain("No spending");
  });

  it("keeps entries from other months out of the displayed day", () => {
    const html = render([
      { date: "2026-09-18", expense: 45000 },
      { date: "2026-08-18", expense: 990000 },
    ]);
    expect(html).toMatch(/>₹450<\/span>/);
    expect(html).not.toContain("₹9.9k");
  });

  it("renders all dates in a leap-year February", () => {
    const html = render([], { year: 2024, month: 2 });
    expect(html.match(/dateTime="2024-02-/g)).toHaveLength(29);
    expect(html).not.toContain("2024-02-30");
  });
});
