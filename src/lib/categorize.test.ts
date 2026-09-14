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
});

describe("guessMerchant", () => {
  it("extracts the merchant from a hyphen-joined UPI reference string", () => {
    expect(guessMerchant("UPI-SWIGGY-9876543210@ybl-1234567890-Payment")).toBe("SWIGGY");
  });

  it("falls back to the first meaningful word for a plain description", () => {
    expect(guessMerchant("paid to Zomato for dinner")).toBe("Zomato");
  });
});
