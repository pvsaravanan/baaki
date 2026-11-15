import { describe, expect, it } from "vitest";
import { accountNameField, OTHER_BANK, parseAccountForm, type AccountFormValues } from "./account-form";

const values: AccountFormValues = {
  typeSelect: "bank", customType: "", bankId: "hdfc", name: "", nickname: "", otherBankName: "",
  balance: "0", color: "#64748b", icon: "bank:hdfc",
};

describe("account form", () => {
  it("uses the selected bank name when the optional nickname is empty", () => {
    const result = parseAccountForm(values);
    expect(result.success && result.data).toMatchObject({ name: "HDFC Bank", icon: "bank:hdfc", color: "#004c8f" });
  });

  it("trims nicknames and preserves the selected bank's identity", () => {
    const result = parseAccountForm({ ...values, nickname: " Salary " });
    expect(result.success && result.data).toMatchObject({ name: "Salary", icon: "bank:hdfc" });
  });

  it("does not persist bank branding after switching to a non-bank type", () => {
    const result = parseAccountForm({ ...values, typeSelect: "cash", name: "Cash" });
    expect(result.success && result.data).toMatchObject({ name: "Cash", type: "cash", icon: "landmark", color: "#64748b" });
  });

  it("restores the selected logo when switching back from a manual icon", () => {
    const result = parseAccountForm({ ...values, icon: "wallet" });
    expect(result.success && result.data.icon).toBe("bank:hdfc");
  });

  it.each([null, "unknown"])("requires a valid bank choice (%s)", (bankId) => {
    const result = parseAccountForm({ ...values, bankId });
    expect(!result.success && result.errors.bank).toBeTruthy();
  });

  it("maps nickname length errors to the visible field", () => {
    const result = parseAccountForm({ ...values, nickname: "x".repeat(81) });
    expect(!result.success && result.errors.nickname).toBeTruthy();
    expect(accountNameField("bank", "hdfc")).toBe("nickname");
  });

  it("maps missing manual bank names to the visible field", () => {
    const result = parseAccountForm({ ...values, bankId: OTHER_BANK });
    expect(!result.success && result.errors.otherBankName).toBeTruthy();
  });

  it("allows other banks without a listed bank logo", () => {
    const result = parseAccountForm({ ...values, bankId: OTHER_BANK, otherBankName: "Local Bank" });
    expect(result.success && result.data).toMatchObject({ name: "Local Bank", icon: "landmark" });
  });

  it("rejects balances beyond the database validation limit", () => {
    const result = parseAccountForm({ ...values, balance: "10000001" });
    expect(!result.success && result.errors.openingBalance).toBeTruthy();
  });
});
