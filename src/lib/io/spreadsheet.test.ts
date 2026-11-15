import { describe, expect, it } from "vitest";
import { cellText, pickSheet, sheetToRows } from "./spreadsheet";
import { findHeaderRow, recordsFromRows, validateImportRows } from "./csv";

describe("cellText", () => {
  it("turns spreadsheet dates into ISO dates without shifting the day", () => {
    expect(cellText(new Date(Date.UTC(2026, 8, 1)))).toBe("2026-09-01");
  });

  it("keeps numbers exact and readable", () => {
    expect(cellText(450)).toBe("450");
    expect(cellText(1200.1 + 1e-12)).toBe("1200.1");
    expect(cellText(-75.5)).toBe("-75.5");
  });

  it("treats empty cells as blank", () => {
    expect(cellText(null)).toBe("");
    expect(cellText(undefined)).toBe("");
  });
});

describe("pickSheet", () => {
  const cover = { sheet: "Cover", rows: [["Account summary"], ["Opening balance", "10,000"]] };
  const statement = {
    sheet: "Statement",
    rows: [["HDFC BANK"], ["Date", "Narration", "Withdrawal Amt.", "Deposit Amt."], ["2026-09-01", "Swiggy", "450", ""]],
  };

  it("skips a cover sheet and uses the one with column headings", () => {
    expect(pickSheet([cover, statement])?.sheet).toBe("Statement");
  });

  it("falls back to the first sheet with data", () => {
    expect(pickSheet([{ sheet: "Empty", rows: [[""]] }, cover])?.sheet).toBe("Cover");
    expect(pickSheet([])).toBeNull();
  });
});

describe("an Excel statement end to end", () => {
  it("imports dates and numbers stored as real spreadsheet values", () => {
    const rows = sheetToRows([
      ["ICICI Bank — Account statement", null, null, null],
      [null, null, null, null],
      ["Value Date", "Transaction Remarks", "Withdrawal Amount (INR)", "Deposit Amount (INR)"],
      [new Date(Date.UTC(2026, 8, 1)), "UPI/SWIGGY", 450, null],
      [new Date(Date.UTC(2026, 8, 2)), "NEFT SALARY", null, 85000],
    ]);
    const { records } = recordsFromRows(rows, findHeaderRow(rows));
    const result = validateImportRows(records, {
      date: "Value Date",
      description: "Transaction Remarks",
      withdrawal: "Withdrawal Amount (INR)",
      deposit: "Deposit Amount (INR)",
    });
    expect(result.invalid).toEqual([]);
    expect(result.valid.map((r) => [r.date, r.type, r.amount])).toEqual([
      ["2026-09-01", "expense", 45_000],
      ["2026-09-02", "income", 8_500_000],
    ]);
  });
});
