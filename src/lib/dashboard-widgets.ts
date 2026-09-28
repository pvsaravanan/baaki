/**
 * Everything the dashboard can show, one entry per tile or card, named
 * exactly as it appears there. Settings lists these; the dashboard renders
 * the enabled ones in the saved order — tiles in the top row, cards below.
 */
export const DASHBOARD_WIDGETS = [
  { key: "balance", label: "Balance", kind: "tile" },
  { key: "income", label: "Income", kind: "tile" },
  { key: "expenses", label: "Expenses", kind: "tile" },
  { key: "net_savings", label: "Net savings", kind: "tile" },
  { key: "savings_rate", label: "Savings rate", kind: "tile" },
  { key: "budget_left", label: "Budget left", kind: "tile" },
  { key: "income_vs_expenses", label: "Income vs expenses", kind: "card" },
  { key: "spending_calendar", label: "Spending calendar", kind: "card" },
  { key: "recent_transactions", label: "Recent transactions", kind: "card" },
  { key: "spending_categories", label: "Spending by category", kind: "card" },
  { key: "budget_progress", label: "Budget", kind: "card" },
  { key: "upcoming_recurring", label: "Upcoming payments", kind: "card" },
  { key: "financial_goals", label: "Goals", kind: "card" },
  { key: "insights", label: "Insights", kind: "card" },
] as const;

export type WidgetKey = (typeof DASHBOARD_WIDGETS)[number]["key"];
export type WidgetKind = "tile" | "card";

export const DEFAULT_DASHBOARD_WIDGETS: WidgetKey[] = DASHBOARD_WIDGETS.map((w) => w.key);

const BY_KEY = new Map<string, (typeof DASHBOARD_WIDGETS)[number]>(DASHBOARD_WIDGETS.map((w) => [w.key, w]));

export function widgetLabel(key: WidgetKey): string {
  return BY_KEY.get(key)!.label;
}

export function widgetKind(key: WidgetKey): WidgetKind {
  return BY_KEY.get(key)!.kind;
}

export function isWidgetKey(value: string): value is WidgetKey {
  return BY_KEY.has(value);
}

/**
 * Keys saved by the earlier, coarser widget list, where one setting covered
 * several things. A saved layout using them is expanded in place.
 */
const LEGACY_WIDGETS: Readonly<Record<string, WidgetKey[]>> = {
  monthly_spending: ["expenses", "income_vs_expenses", "spending_calendar"],
  savings: ["net_savings", "savings_rate"],
  budget: ["budget_left", "budget_progress"],
};

/**
 * A saved layout as current keys: legacy keys expanded, unknown ones dropped,
 * duplicates removed, and tiles ahead of cards (they render in separate
 * rows, so that's the only order that means anything) — each group keeping
 * its saved order.
 */
export function normalizeWidgets(saved: readonly string[]): WidgetKey[] {
  const seen = new Set<WidgetKey>();
  const out: WidgetKey[] = [];
  for (const raw of saved) {
    for (const key of LEGACY_WIDGETS[raw] ?? (isWidgetKey(raw) ? [raw] : [])) {
      if (!seen.has(key)) {
        seen.add(key);
        out.push(key);
      }
    }
  }
  return [...out.filter((k) => widgetKind(k) === "tile"), ...out.filter((k) => widgetKind(k) === "card")];
}
