import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { Segmented } from "./segmented";

it("does not submit its parent form when selecting an option", () => {
  const html = renderToStaticMarkup(createElement(Segmented, {
    value: "expense",
    onChange: () => {},
    options: [{ value: "expense", label: "Expense" }, { value: "income", label: "Income" }],
  }));
  expect(html.match(/type="button"/g)).toHaveLength(2);
  expect(html).not.toContain('type="submit"');
});
