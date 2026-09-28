import { describe, expect, it } from "vitest";
import { CATEGORY_RULES, guessMerchant, suggestCategoryKey } from "./categorize";
import { DEFAULT_CATEGORIES } from "./constants";

describe("suggestCategoryKey", () => {
  it("matches the 'vi' keyword as a standalone word (Vodafone Idea recharge)", () => {
    expect(suggestCategoryKey("Vi recharge 199")).toBe("bills-utilities");
    expect(suggestCategoryKey("Recharge for vi")).toBe("bills-utilities");
  });

  it("does not match 'vi' inside an unrelated word", () => {
    expect(suggestCategoryKey("Movie ticket booking")).not.toBe("bills-utilities");
  });

  it("suggests categories from common merchants", () => {
    expect(suggestCategoryKey("Swiggy dinner")).toBe("food");
    expect(suggestCategoryKey("Uber to office")).toBe("transportation");
    expect(suggestCategoryKey("Netflix")).toBe("subscriptions");
    expect(suggestCategoryKey("College fee")).toBe("education");
    expect(suggestCategoryKey("BigBasket groceries")).toBe("groceries");
    expect(suggestCategoryKey("Amazon order")).toBe("shopping");
    expect(suggestCategoryKey("Jio recharge")).toBe("bills-utilities");
  });

  it("only points at built-in categories that exist", () => {
    const keys = new Set(DEFAULT_CATEGORIES.map((c) => c.key));
    expect(CATEGORY_RULES.every((r) => keys.has(r.key))).toBe(true);
    expect(keys.size).toBe(DEFAULT_CATEGORIES.length);
  });

  it("returns null when nothing matches", () => {
    expect(suggestCategoryKey("xyzzy random note")).toBeNull();
    expect(suggestCategoryKey("")).toBeNull();
  });
});

describe("guessMerchant", () => {
  it("extracts the merchant from a hyphen-joined UPI reference string", () => {
    expect(guessMerchant("UPI-SWIGGY-9876543210@ybl-1234567890-Payment")).toBe("SWIGGY");
  });

  it("falls back to the first meaningful word for a plain description", () => {
    expect(guessMerchant("paid to Zomato for dinner")).toBe("Zomato");
    expect(guessMerchant("Swiggy dinner")).toBe("Swiggy");
    expect(guessMerchant("paid Uber to office")).toBe("Uber");
  });
});
