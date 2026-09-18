import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ExpenseSplitMethodPicker } from "./expense-split-method";
import type { ExpenseSplitMethod } from "@/lib/expense-split";

describe("expense split method picker", () => {
  it("shows all four methods without submitting the surrounding form", () => {
    const html = renderToStaticMarkup(createElement(ExpenseSplitMethodPicker, { value: "equal", onChange: () => {} }));
    for (const label of ["Split evenly", "Split by amounts", "Split by shares", "Split by percentages"]) {
      expect(html).toContain(label);
    }
    expect(html.match(/type="button"/g)).toHaveLength(4);
  });

  it.each<ExpenseSplitMethod>(["equal", "amounts", "shares", "percent"])("marks only %s as selected", (value) => {
    const html = renderToStaticMarkup(createElement(ExpenseSplitMethodPicker, { value, onChange: () => {} }));
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(html.match(/aria-pressed="false"/g)).toHaveLength(3);
  });
});
