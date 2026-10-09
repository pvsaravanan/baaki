"use client";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { widgetKind, widgetLabel, type WidgetKey, type WidgetKind } from "@/lib/dashboard-widgets";
import { apiPatch, ApiError } from "@/lib/http";
import { cn } from "@/lib/cn";
import { useAppData } from "@/components/app/app-data";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { Section } from "./layout";
import { buildWidgetItems, moveWidget, type WidgetItem } from "./widget-items";

const WIDGET_GROUPS: { kind: WidgetKind; title: string; hint: string }[] = [
  { kind: "tile", title: "Top tiles", hint: "The row of figures at the top" },
  { kind: "card", title: "Cards", hint: "Everything below the tiles" },
];

export function DashboardSection() {
  const { preference, refresh } = useAppData();
  const { success, error } = useToast();

  const [widgets, setWidgets] = useState<WidgetItem[]>(() =>
    buildWidgetItems(preference.dashboardWidgets),
  );
  const [savingLayout, setSavingLayout] = useState(false);

  // Resync when the saved layout changes underneath us (e.g. edited on another
  // tab/device, then refreshed) — the initial-state initializer runs only once.
  const savedLayoutKey = JSON.stringify(preference.dashboardWidgets);
  useEffect(() => {
    setWidgets(buildWidgetItems(preference.dashboardWidgets));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedLayoutKey]);

  const enabledOrder = useMemo(
    () => widgets.filter((w) => w.enabled).map((w) => w.key),
    [widgets],
  );
  const layoutDirty = useMemo(
    () => JSON.stringify(enabledOrder) !== JSON.stringify(preference.dashboardWidgets),
    [enabledOrder, preference.dashboardWidgets],
  );

  function toggleWidget(key: WidgetKey) {
    setWidgets((prev) => prev.map((w) => (w.key === key ? { ...w, enabled: !w.enabled } : w)));
  }

  async function handleSaveLayout() {
    setSavingLayout(true);
    try {
      await apiPatch("/api/preferences", { dashboardWidgets: enabledOrder });
      success("Dashboard layout saved");
      refresh();
    } catch (e) {
      error(e instanceof ApiError ? e.message : "Could not save layout");
    } finally {
      setSavingLayout(false);
    }
  }

  return (
    <Section
      id="dashboard"
      title="Dashboard"
      description="Pick what your dashboard shows and in what order, top to bottom."
      aside={
        <span className="text-label-md uppercase text-muted">
          {enabledOrder.length} of {widgets.length} shown
        </span>
      }
    >
      {WIDGET_GROUPS.map((group) => {
        const members = widgets.map((w, i) => ({ w, i })).filter(({ w }) => widgetKind(w.key) === group.kind);
        const enabledInGroup = members.filter(({ w }) => w.enabled).map(({ w }) => w.key);
        return (
          <div key={group.kind}>
            <div className="flex items-baseline justify-between gap-3 border-b border-border bg-surface-2 px-3 py-2 sm:px-5">
              <span className="text-label-md uppercase text-fg">{group.title}</span>
              <span className="text-xs text-muted">{group.hint}</span>
            </div>
            <ul className="divide-y divide-border">
              {members.map(({ w, i }, pos) => (
                <li key={w.key} className="flex items-center gap-3 px-3 py-2.5 sm:px-5">
                  <span
                    className={cn(
                      "w-6 shrink-0 text-center text-label-md tabular-nums",
                      w.enabled ? "text-fg" : "text-faint",
                    )}
                  >
                    {w.enabled ? enabledInGroup.indexOf(w.key) + 1 : "–"}
                  </span>
                  <span className={cn("min-w-0 flex-1 truncate text-body-sm", w.enabled ? "text-fg" : "text-faint")}>
                    {widgetLabel(w.key)}
                  </span>
                  <div className="flex shrink-0">
                    <button
                      type="button"
                      aria-label={`Move ${widgetLabel(w.key)} up`}
                      disabled={pos === 0}
                      onClick={() => setWidgets((prev) => moveWidget(prev, i, -1))}
                      className="flex h-8 w-8 items-center justify-center text-faint transition-colors hover:text-fg disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ChevronUp className="h-4 w-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${widgetLabel(w.key)} down`}
                      disabled={pos === members.length - 1}
                      onClick={() => setWidgets((prev) => moveWidget(prev, i, 1))}
                      className="flex h-8 w-8 items-center justify-center text-faint transition-colors hover:text-fg disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ChevronDown className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                  <Switch checked={w.enabled} onChange={() => toggleWidget(w.key)} label={widgetLabel(w.key)} />
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      {/* Save bar — only when the layout differs from what's saved. */}
      {layoutDirty && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-brand-soft px-5 py-3">
          <span className="text-body-sm text-fg">You have unsaved changes.</span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setWidgets(buildWidgetItems(preference.dashboardWidgets))}
              disabled={savingLayout}
            >
              Discard
            </Button>
            <Button size="sm" onClick={handleSaveLayout} loading={savingLayout}>
              Save layout
            </Button>
          </div>
        </div>
      )}
    </Section>
  );
}
