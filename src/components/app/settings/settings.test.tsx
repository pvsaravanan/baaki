import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DASHBOARD_WIDGETS, widgetKind } from "@/lib/dashboard-widgets";
import { ActionRow, Row } from "./layout";
import { buildWidgetItems, moveWidget } from "./widget-items";

describe("dashboard widget list", () => {
  it("lists every widget once: saved ones first in each group, in saved order", () => {
    const items = buildWidgetItems(["insights", "income", "balance"]);
    expect(items).toHaveLength(DASHBOARD_WIDGETS.length);
    expect(items.slice(0, 3)).toEqual([
      { key: "income", enabled: true },
      { key: "balance", enabled: true },
      { key: "expenses", enabled: false },
    ]);
    const firstCard = items.findIndex((w) => w.key === "insights");
    expect(items[firstCard]).toEqual({ key: "insights", enabled: true });
    expect(items.slice(firstCard + 1).every((w) => !w.enabled)).toBe(true);
  });

  it("moves a widget within its group but never across into the other", () => {
    const items = buildWidgetItems(["balance", "income", "insights"]);
    expect(moveWidget(items, 1, -1).slice(0, 2).map((w) => w.key)).toEqual(["income", "balance"]);
    const tiles = items.filter((w) => widgetKind(w.key) === "tile").length;
    expect(moveWidget(items, tiles - 1, 1)).toBe(items); // last tile can't drop into the cards
    expect(moveWidget(items, tiles, -1)).toBe(items); // first card can't rise into the tiles
    expect(moveWidget(items, 0, -1)).toBe(items);
    expect(moveWidget(items, items.length - 1, 1)).toBe(items);
  });
});

describe("settings rows", () => {
  const html = (el: React.ReactElement) => renderToStaticMarkup(el);

  it("labels a row's control when it names one", () => {
    expect(html(<Row title="Default account" htmlFor="acct">x</Row>)).toContain('<label for="acct"');
    expect(html(<Row title="Dark mode">x</Row>)).not.toContain("<label");
  });

  it("shows a busy action as preparing and stops it being pressed again", () => {
    const out = html(<ActionRow icon={null} title="Full backup" description="d" trailing={null} onClick={() => {}} busy />);
    expect(out).toContain("Full backup — preparing…");
    expect(out).toMatch(/<button[^>]*disabled=""/);
  });

  it("renders a link row as a link, not a button", () => {
    const out = html(<ActionRow icon={null} title="Import" description="d" trailing={null} href="/import" />);
    expect(out).toContain('href="/import"');
    expect(out).not.toContain("<button");
  });
});
