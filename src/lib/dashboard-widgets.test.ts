import { describe, expect, it } from "vitest";
import { DEFAULT_DASHBOARD_WIDGETS, normalizeWidgets, widgetKind, widgetLabel } from "./dashboard-widgets";

describe("normalizeWidgets", () => {
  it("expands keys from the old, coarser list in place", () => {
    expect(normalizeWidgets(["balance", "monthly_spending", "savings", "budget", "insights"])).toEqual([
      "balance",
      "expenses",
      "net_savings",
      "savings_rate",
      "budget_left",
      "income_vs_expenses",
      "spending_calendar",
      "budget_progress",
      "insights",
    ]);
  });

  it("puts tiles ahead of cards, keeping each group's order", () => {
    expect(normalizeWidgets(["insights", "income", "spending_categories", "balance"])).toEqual([
      "income",
      "balance",
      "insights",
      "spending_categories",
    ]);
  });

  it("drops unknown keys and duplicates", () => {
    expect(normalizeWidgets(["nope", "balance", "balance", "budget", "budget_left"])).toEqual([
      "balance",
      "budget_left",
      "budget_progress",
    ]);
  });

  it("leaves the default layout unchanged", () => {
    expect(normalizeWidgets(DEFAULT_DASHBOARD_WIDGETS)).toEqual(DEFAULT_DASHBOARD_WIDGETS);
  });
});

describe("widget metadata", () => {
  it("names widgets as the dashboard shows them", () => {
    expect(widgetLabel("upcoming_recurring")).toBe("Upcoming payments");
    expect(widgetLabel("financial_goals")).toBe("Goals");
    expect(widgetKind("budget_left")).toBe("tile");
    expect(widgetKind("budget_progress")).toBe("card");
  });
});
