import { describe, expect, it } from "vitest";
import { buildCSV, dedupeKey, detectDateFormat, findHeaderRow, normalizeDate, parseAmount, recordsFromRows, validateImportRows } from "./csv";
import { toPaise } from "./money";

describe("buildCSV", () => {
  it("quotes cells containing commas, quotes and newlines", () => {
    const csv = buildCSV(["a", "b"], [["plain", 'has,comma'], ['say "hi"', "line\nbreak"]]);
    expect(csv).toBe('a,b\r\nplain,"has,comma"\r\n"say ""hi""","line\nbreak"');
  });

  it("neutralizes a leading formula character to prevent CSV/formula injection", () => {
    const csv = buildCSV(["a"], [["=cmd|' /C calc'!A1"], ["+1"], ["-1"], ["@SUM(1)"], ["plain"]]);
    const lines = csv.split("\r\n");
    expect(lines[1]).toBe("'=cmd|' /C calc'!A1");
    expect(lines[2]).toBe("'+1");
    expect(lines[3]).toBe("'-1");
    expect(lines[4]).toBe("'@SUM(1)");
    expect(lines[5]).toBe("plain");
  });
});

describe("normalizeDate & detectDateFormat", () => {
  it("accepts ISO and common Indian formats", () => {
    expect(normalizeDate("2026-08-11")).toBe("2026-08-11");
    expect(normalizeDate("11/08/2026")).toBe("2026-08-11"); // DD/MM
    expect(normalizeDate("11-08-2026")).toBe("2026-08-11");
    expect(normalizeDate("31/12/25")).toBe("2025-12-31");
  });
  it("honors explicit format hints", () => {
    expect(normalizeDate("08/01/2026", "MM/DD/YYYY")).toBe("2026-08-01");
    expect(normalizeDate("01/08/2026", "DD/MM/YYYY")).toBe("2026-08-01");
  });
  it("detects MM/DD/YYYY across file column samples", () => {
    const dates = ["08/01/2026", "08/02/2026", "08/14/2026"];
    const fmt = detectDateFormat(dates);
    expect(fmt).toBe("MM/DD/YYYY");
  });
  it("detects DD/MM/YYYY across file column samples", () => {
    const dates = ["01/08/2026", "02/08/2026", "14/08/2026"];
    const fmt = detectDateFormat(dates);
    expect(fmt).toBe("DD/MM/YYYY");
  });
  it.each(["2026/02/30", "2026.02.30", "2026-2-30"])("rejects impossible year-first dates: %s", (value) => {
    expect(normalizeDate(value)).toBeNull();
  });
  it("accepts valid unpadded year-first dates", () => {
    expect(normalizeDate("2026/9/8")).toBe("2026-09-08");
  });
  it("rejects impossible dates", () => {
    expect(normalizeDate("2026-02-30")).toBeNull();
    expect(normalizeDate("not a date")).toBeNull();
    expect(normalizeDate("")).toBeNull();
  });
});

describe("validateImportRows", () => {
  const mapping = {
    date: "Txn Date",
    description: "Details",
    amount: "Amount",
    type: "Type",
  };

  it("infers expense from a negative sign even when the mapped Type column is blank for that row", () => {
    const rows = [{ "Txn Date": "2026-08-01", Details: "Swiggy", Amount: "-450", Type: "" }];
    const result = validateImportRows(rows, mapping);
    expect(result.valid).toHaveLength(1);
    expect(result.valid[0].type).toBe("expense");
    expect(result.valid[0].amount).toBe(toPaise(450));
  });

  it("flags a row as ambiguous instead of guessing when the mapped Type column is blank and the amount is positive", () => {
    const rows = [{ "Txn Date": "2026-08-01", Details: "Salary", Amount: "65000", Type: "" }];
    const result = validateImportRows(rows, mapping);
    expect(result.valid).toHaveLength(0);
    expect(result.invalid).toHaveLength(1);
    expect(result.invalid[0].errors.join(" ")).toMatch(/blank/i);
  });

  it.each(["exepnse", "unknown"])("rejects an unrecognized explicit type: %s", (type) => {
    const result = validateImportRows([{ "Txn Date": "2026-08-01", Details: "Purchase", Amount: "500", Type: type }], mapping);
    expect(result.valid).toHaveLength(0);
    expect(result.invalid[0].errors.join(" ")).toMatch(/type/i);
  });

  it("honors an explicit type column (debit/credit)", () => {
    const rows = [
      { "Txn Date": "2026-08-01", Details: "ATM", Amount: "500", Type: "debit" },
      { "Txn Date": "2026-08-02", Details: "Refund", Amount: "200", Type: "credit" },
    ];
    const result = validateImportRows(rows, mapping);
    expect(result.valid[0].type).toBe("expense");
    expect(result.valid[1].type).toBe("income");
  });

  it("imports a 'refund' type as income", () => {
    const rows = [{ "Txn Date": "2026-08-02", Details: "Train ticket", Amount: "370.36", Type: "Refund" }];
    const result = validateImportRows(rows, mapping);
    expect(result.valid[0].type).toBe("income");
  });

  it("collects invalid rows with reasons", () => {
    const rows = [
      { "Txn Date": "garbage", Details: "", Amount: "abc", Type: "" },
      { "Txn Date": "2026-08-01", Details: "ok", Amount: "0", Type: "" },
    ];
    const result = validateImportRows(rows, mapping);
    expect(result.valid).toHaveLength(0);
    expect(result.invalid).toHaveLength(2);
    expect(result.invalid[0].errors.length).toBeGreaterThanOrEqual(2);
  });

  it("flags all rows invalid when required columns are unmapped", () => {
    const result = validateImportRows([{ a: "1" }], { amount: "a" });
    expect(result.valid).toHaveLength(0);
    expect(result.invalid).toHaveLength(1);
  });

  it("rejects rows instead of silently guessing income when the file has no type column and no negative amounts", () => {
    const noTypeMapping = { date: "Txn Date", description: "Details", amount: "Amount" };
    const rows = [
      { "Txn Date": "2026-08-01", Details: "Swiggy", Amount: "450" },
      { "Txn Date": "2026-08-02", Details: "Zomato", Amount: "300" },
    ];
    const result = validateImportRows(rows, noTypeMapping);
    expect(result.valid).toHaveLength(0);
    expect(result.invalid).toHaveLength(2);
    expect(result.invalid[0].errors.join(" ")).toMatch(/Type|Debit-Credit/);
  });

  it("still infers type from sign when some amounts are negative, even with no type column", () => {
    const noTypeMapping = { date: "Txn Date", description: "Details", amount: "Amount" };
    const rows = [
      { "Txn Date": "2026-08-01", Details: "Swiggy", Amount: "-450" },
      { "Txn Date": "2026-08-01", Details: "Salary", Amount: "65000" },
    ];
    const result = validateImportRows(rows, noTypeMapping);
    expect(result.valid).toHaveLength(2);
    expect(result.valid[0].type).toBe("expense");
    expect(result.valid[1].type).toBe("income");
  });

  it("rejects transfer rows — import has no destination-account column", () => {
    const rows = [{ "Txn Date": "2026-08-01", Details: "To savings", Amount: "1000", Type: "transfer" }];
    const result = validateImportRows(rows, mapping);
    expect(result.valid).toHaveLength(0);
    expect(result.invalid).toHaveLength(1);
    expect(result.invalid[0].errors.join(" ")).toMatch(/[Tt]ransfer/);
  });
});

describe("dedupeKey", () => {
  it("matches identical transactions regardless of case/whitespace", () => {
    const a = dedupeKey({ date: "2026-08-01", amount: 45000, description: "Swiggy ", type: "expense" });
    const b = dedupeKey({ date: "2026-08-01", amount: 45000, description: "swiggy", type: "expense" });
    expect(a).toBe(b);
  });
  it("differs when amount or date differ", () => {
    const a = dedupeKey({ date: "2026-08-01", amount: 45000, description: "x", type: "expense" });
    const b = dedupeKey({ date: "2026-08-02", amount: 45000, description: "x", type: "expense" });
    expect(a).not.toBe(b);
  });
});

describe("parseAmount", () => {
  it.each([
    ["1,200.50", 120_050, null],
    ["₹1,200.50", 120_050, null],
    ["Rs. 450", 45_000, null],
    ["INR 90", 9_000, null],
    ["-450", 45_000, "out"],
    ["(450.00)", 45_000, "out"],
    ["450.00-", 45_000, "out"],
    ["1,200.00 Dr", 120_000, "out"],
    ["1,200.00 DR.", 120_000, "out"],
    ["500 Cr", 50_000, "in"],
    ["Cr 500", 50_000, "in"],
    ["₹ 2,500.00 Cr", 250_000, "in"],
  ] as const)("reads %s", (raw, paise, direction) => {
    expect(parseAmount(raw)).toEqual({ paise, direction });
  });

  it.each(["", "abc", "12a", "Dr", "--"])("rejects %j", (raw) => {
    expect(parseAmount(raw)).toBeNull();
  });
});

describe("findHeaderRow & recordsFromRows", () => {
  // Shaped like an Indian bank statement: account details above the table.
  const rows = [
    ["HDFC BANK Ltd.", "", "", "", "", ""],
    ["Account No : 50100123456789", "", "", "", "", ""],
    ["Statement From : 01/09/2026 To : 30/09/2026", "", "", "", "", ""],
    ["", "", "", "", "", ""],
    ["Date", "Narration", "Chq./Ref.No.", "Withdrawal Amt.", "Deposit Amt.", "Closing Balance"],
    ["01/09/26", "UPI-SWIGGY", "0000123", "450.00", "", "24,550.00"],
    ["02/09/26", "SALARY SEP", "0000124", "", "85,000.00", "1,09,550.00"],
  ];

  it("skips the account details above the column headings", () => {
    expect(findHeaderRow(rows)).toBe(4);
  });

  it("falls back to the first row when nothing looks like headings", () => {
    expect(findHeaderRow([["a", "b"], ["1", "2"]])).toBe(0);
  });

  it("builds records under those headings, naming blank or repeated ones", () => {
    const { headers, records } = recordsFromRows(rows, 4);
    expect(headers).toEqual(["Date", "Narration", "Chq./Ref.No.", "Withdrawal Amt.", "Deposit Amt.", "Closing Balance"]);
    expect(records).toHaveLength(2);
    expect(records[1]["Deposit Amt."]).toBe("85,000.00");
    expect(recordsFromRows([["Date", "", "Date"], ["1", "2", "3"]], 0).headers).toEqual(["Date", "Column 2", "Date (2)"]);
  });

  it("imports a whole statement with separate Withdrawal and Deposit columns", () => {
    const { records } = recordsFromRows(rows, findHeaderRow(rows));
    const result = validateImportRows(records, {
      date: "Date",
      description: "Narration",
      withdrawal: "Withdrawal Amt.",
      deposit: "Deposit Amt.",
    });
    expect(result.invalid).toEqual([]);
    expect(result.valid.map((r) => [r.type, r.amount, r.date])).toEqual([
      ["expense", 45_000, "2026-09-01"],
      ["income", 8_500_000, "2026-09-02"],
    ]);
  });
});

describe("validateImportRows amounts", () => {
  const mapping = { date: "Date", description: "Details", amount: "Amount" };
  const row = (Amount: string) => ({ Date: "2026-08-01", Details: "x", Amount });

  it("uses Dr/Cr markers and brackets to tell expense from income", () => {
    const result = validateImportRows([row("1,200.00 Dr"), row("500 Cr"), row("(75.50)")], mapping);
    expect(result.valid.map((r) => [r.type, r.amount])).toEqual([
      ["expense", 120_000],
      ["income", 50_000],
      ["expense", 7_550],
    ]);
  });

  it("flags a Withdrawal/Deposit row with both or neither filled", () => {
    const split = { date: "Date", description: "Details", withdrawal: "Out", deposit: "In" };
    const result = validateImportRows(
      [
        { Date: "2026-08-01", Details: "both", Out: "10", In: "20" },
        { Date: "2026-08-01", Details: "neither", Out: "", In: "0.00" },
      ],
      split,
    );
    expect(result.valid).toHaveLength(0);
    expect(result.invalid[0].errors.join(" ")).toMatch(/Both/);
    expect(result.invalid[1].errors.join(" ")).toMatch(/No amount/);
  });
});
