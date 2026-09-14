import { describe, expect, it } from "vitest";
import { guessMerchant, suggestCategory } from "./categorize";

describe("suggestCategory", () => {
  it("matches the 'vi' keyword as a standalone word (Vodafone Idea recharge)", () => {
    expect(suggestCategory("Vi recharge 199")).toBe("Bills & Utilities");
    expect(suggestCategory("Recharge for vi")).toBe("Bills & Utilities");
  });

  it("does not match 'vi' inside an unrelated word", () => {
    expect(suggestCategory("Movie ticket booking")).not.toBe("Bills & Utilities");
  });

  it("suggests categories from common merchants", () => {
    expect(suggestCategory("Swiggy dinner")).toBe("Food");
    expect(suggestCategory("Uber to office")).toBe("Transportation");
    expect(suggestCategory("Netflix")).toBe("Subscriptions");
    expect(suggestCategory("College fee")).toBe("Education");
    expect(suggestCategory("BigBasket groceries")).toBe("Groceries");
    expect(suggestCategory("Amazon order")).toBe("Shopping");
    expect(suggestCategory("Jio recharge")).toBe("Bills & Utilities");
  });

  it("returns null when nothing matches", () => {
    expect(suggestCategory("xyzzy random note")).toBeNull();
    expect(suggestCategory("")).toBeNull();
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
