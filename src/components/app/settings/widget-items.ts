import { DASHBOARD_WIDGETS, normalizeWidgets, widgetKind, type WidgetKey } from "@/lib/dashboard-widgets";

export interface WidgetItem {
  key: WidgetKey;
  enabled: boolean;
}

/**
 * The ordered widget list, grouped tiles-then-cards (the dashboard renders
 * them in separate rows): each group's saved widgets first, in saved order,
 * then the rest of that group toggled off.
 */
export function buildWidgetItems(saved: string[]): WidgetItem[] {
  const enabled = normalizeWidgets(saved);
  const items: WidgetItem[] = [];
  for (const kind of ["tile", "card"] as const) {
    for (const key of enabled) if (widgetKind(key) === kind) items.push({ key, enabled: true });
    for (const { key } of DASHBOARD_WIDGETS) {
      if (widgetKind(key) === kind && !enabled.includes(key)) items.push({ key, enabled: false });
    }
  }
  return items;
}

/** Swap with the neighbour above/below — only within the same group. */
export function moveWidget(items: WidgetItem[], index: number, dir: -1 | 1): WidgetItem[] {
  const target = index + dir;
  if (target < 0 || target >= items.length) return items;
  if (widgetKind(items[target].key) !== widgetKind(items[index].key)) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
