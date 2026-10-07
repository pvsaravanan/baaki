/**
 * CSV utilities: a dependency-free CSV writer (used for exports) and pure
 * import-mapping/validation logic (used by the import API and its tests).
 */
import { fromISODate, toISODate } from "./dates";
import { toPaise } from "./money";
import { isTransactionType, type TransactionType } from "./constants";

/** Quote a value for CSV per RFC 4180. */
function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  // Neutralize formula/DDE injection: a cell starting with =, +, -, or @ is
  // interpreted as a live formula by Excel/Sheets when the file is opened
  // there. A leading single quote forces it to be read as plain text (free
  // text fields like description/merchant/notes flow straight into cells).
  // A plain negative number ("-350.50") can't be a formula and must stay a
  // number, so running balances and the like aren't turned into text.
  if (/^[=+\-@]/.test(s) && !/^-\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function buildCSV(headers: string[], rows: Array<Array<string | number | null | undefined>>): string {
  const lines = [headers.map(csvCell).join(",")];
  for (const row of rows) lines.push(row.map(csvCell).join(","));
  return lines.join("\r\n");
}

// ---- Import ----------------------------------------------------------------

export type ImportField =
  | "date"
  | "description"
  | "amount"
  | "withdrawal"
  | "deposit"
  | "type"
  | "category"
  | "account"
  | "paymentMethod"
  | "notes";

export type ColumnMapping = Partial<Record<ImportField, string>>;

/**
 * The amount can come from a single Amount column, or — as most Indian bank
 * statements lay it out — from separate Withdrawal and Deposit columns.
 */
export function hasAmountMapping(mapping: ColumnMapping): boolean {
  return Boolean(mapping.amount || mapping.withdrawal || mapping.deposit);
}

export interface ParsedAmount {
  paise: number; // always positive
  /** "out" = money spent, "in" = money received, null = the text doesn't say. */
  direction: "out" | "in" | null;
}

/**
 * Read an amount the way bank statements write it: "₹1,200.50", "Rs. 450",
 * "INR 90", "1,200.00 Dr" / "Cr 500", "(450.00)" or "450.00-" for negatives,
 * "-450". Returns null when the text isn't an amount at all.
 */
export function parseAmount(raw: string): ParsedAmount | null {
  let s = raw.trim();
  if (!s) return null;
  let direction: ParsedAmount["direction"] = null;

  // "Dr"/"Cr" before or after the number says which way the money went.
  const leading = /^(dr|cr)\.?\s*(.+)$/i.exec(s);
  const trailing = /^(.+?)\s*(dr|cr)\.?$/i.exec(s);
  if (leading || trailing) {
    const marker = leading ? leading[1] : trailing![2];
    s = (leading ? leading[2] : trailing![1]).trim();
    direction = marker.toLowerCase() === "dr" ? "out" : "in";
  }

  // Currency symbols/words and grouping separators carry no meaning here.
  s = s.replace(/₹|\brs\.?|\binr\b/gi, "").replace(/[,\s]/g, "");

  // Negatives: (450.00), 450.00- or -450.
  let negative = false;
  const paren = /^\((.+)\)$/.exec(s);
  if (paren) {
    negative = true;
    s = paren[1];
  }
  if (s.endsWith("-")) {
    negative = true;
    s = s.slice(0, -1);
  }
  if (s.startsWith("-")) {
    negative = true;
    s = s.slice(1);
  } else if (s.startsWith("+")) {
    s = s.slice(1);
  }

  if (!/^(\d+\.?\d*|\.\d+)$/.test(s)) return null;
  let paise: number;
  try {
    paise = Math.abs(toPaise(s));
  } catch {
    return null;
  }
  if (negative && direction === null) direction = "out";
  return { paise, direction };
}

/** Words that appear in the column-heading row of bank statements. */
const HEADER_WORDS = [
  "date", "narration", "description", "particulars", "details", "remarks", "amount", "amt",
  "withdrawal", "deposit", "debit", "credit", "balance", "type", "ref", "cheque", "chq", "category", "account",
];

function headerMatches(row: string[]): { count: number; hasDate: boolean } {
  let count = 0;
  let hasDate = false;
  for (const cell of row) {
    const lower = cell.trim().toLowerCase();
    if (!lower || lower.length > 40) continue;
    if (HEADER_WORDS.some((w) => lower.includes(w))) count += 1;
    if (lower.includes("date")) hasDate = true;
  }
  return { count, hasDate };
}

/**
 * Where the column headings are. Bank statements often start with lines of
 * account details (name, account number, period…) before the table; this
 * finds the first row that reads like headings — a "date" column plus at
 * least one other known heading — within the first 40 rows. Falls back to
 * the first row.
 */
export function findHeaderRow(rows: string[][]): number {
  const limit = Math.min(rows.length, 40);
  for (let i = 0; i < limit; i++) {
    const { count, hasDate } = headerMatches(rows[i]);
    if (hasDate && count >= 2) return i;
  }
  return 0;
}

/**
 * Turn parsed CSV rows into records keyed by the heading row. Blank headings
 * become "Column N" and repeated ones get a number, so no column is lost;
 * rows with nothing in them are dropped.
 */
export function recordsFromRows(rows: string[][], headerIndex: number): { headers: string[]; records: Record<string, string>[] } {
  const seen = new Map<string, number>();
  const headers = (rows[headerIndex] ?? []).map((cell, i) => {
    const base = cell.trim() || `Column ${i + 1}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base} (${n})`;
  });
  const records: Record<string, string>[] = [];
  for (const row of rows.slice(headerIndex + 1)) {
    if (!row.some((cell) => cell != null && String(cell).trim() !== "")) continue;
    const record: Record<string, string> = {};
    headers.forEach((h, i) => {
      record[h] = row[i] != null ? String(row[i]) : "";
    });
    records.push(record);
  }
  return { headers, records };
}

export interface ParsedImportRow {
  index: number; // original row index (0-based, excludes header)
  type: TransactionType;
  amount: number; // paise
  description: string;
  date: string; // ISO
  categoryName: string | null;
  accountName: string | null;
  paymentMethod: string | null;
  notes: string | null;
}

export interface InvalidImportRow {
  index: number;
  errors: string[];
  raw: Record<string, string>;
}

export interface ImportValidation {
  valid: ParsedImportRow[];
  invalid: InvalidImportRow[];
  total: number;
}

export type DateFormatHint = "auto" | "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";

/**
 * Detect the dominant date format across an entire column of sample dates.
 * If any row has field1 > 12 (e.g. 25/08/2026), it's DD/MM/YYYY.
 * If any row has field2 > 12 (e.g. 08/25/2026), it's MM/DD/YYYY.
 * If starting with 4 digits, it's YYYY-MM-DD.
 */
export function detectDateFormat(dates: string[]): "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD" {
  let hasFirstAbove12 = false;
  let hasSecondAbove12 = false;
  let isIso = false;

  for (const raw of dates) {
    const s = raw?.trim() ?? "";
    if (!s) continue;
    if (/^\d{4}[/\-.]\d{1,2}[/\-.]\d{1,2}$/.test(s)) {
      isIso = true;
      continue;
    }
    const m = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/.exec(s);
    if (m) {
      const a = Number(m[1]);
      const b = Number(m[2]);
      if (a > 12 && b <= 12) hasFirstAbove12 = true;
      if (b > 12 && a <= 12) hasSecondAbove12 = true;
    }
  }

  if (hasSecondAbove12 && !hasFirstAbove12) return "MM/DD/YYYY";
  if (hasFirstAbove12) return "DD/MM/YYYY";
  if (isIso) return "YYYY-MM-DD";
  return "DD/MM/YYYY"; // default fallback in Indian locale
}

/**
 * Validate raw CSV records against a column mapping. Amount sign convention:
 * a negative amount (or an explicit "expense" type) means an expense; a
 * positive amount defaults to income only when the type column says so,
 * otherwise the magnitude is used with the mapped/derived type.
 */
export function validateImportRows(
  records: Record<string, string>[],
  mapping: ColumnMapping,
  dateFormat: DateFormatHint = "auto",
): ImportValidation {
  const valid: ParsedImportRow[] = [];
  const invalid: InvalidImportRow[] = [];

  if (!mapping.date || !hasAmountMapping(mapping) || !mapping.description) {
    // Caller must map the required fields; report all rows as invalid.
    return {
      valid: [],
      invalid: records.map((raw, index) => ({
        index,
        raw,
        errors: ["Map the Date, Description and Amount (or Withdrawal/Deposit) columns to continue"],
      })),
      total: records.length,
    };
  }

  // If auto, sample all dates across records to determine a single consistent format
  const resolvedFormat =
    dateFormat === "auto"
      ? detectDateFormat(records.map((r) => mapping.date ? r[mapping.date] ?? "" : ""))
      : dateFormat;

  // Sign-based type inference (below) is meaningless when the file never
  // uses a negative amount at all — many Indian bank exports show every
  // amount unsigned and convey debit/credit via a separate column instead.
  // Without a mapped Type column and without any negative amount anywhere
  // in the file, we cannot tell expenses from income; defaulting silently to
  // "income" would mis-tag every expense row with no visible error. Detect
  // that case up front and require the user to map a Type column instead of
  // guessing.
  //
  // Separate Withdrawal/Deposit columns always say which way the money went,
  // and so do Dr/Cr markers or brackets in a single Amount column.
  const hasTypeColumn = Boolean(mapping.type);
  const splitColumns = !mapping.amount;
  const hasAnyDirection =
    splitColumns || hasTypeColumn
      ? true // irrelevant: the direction comes from the columns / type
      : records.some((raw) => parseAmount(raw[mapping.amount!] ?? "")?.direction != null);
  const fileIsAmbiguous = !hasAnyDirection && records.length > 0;

  records.forEach((raw, index) => {
    const errors: string[] = [];
    const get = (f: ImportField) => (mapping[f] ? (raw[mapping[f]!] ?? "").trim() : "");

    const rawDate = get("date");
    const date = normalizeDate(rawDate, resolvedFormat);
    if (!date) errors.push(`Invalid date: "${rawDate}"`);

    const description = get("description");
    if (!description) errors.push("Description is required");

    let amountPaise = 0;
    let direction: ParsedAmount["direction"] = null;
    let rawAmount = get("amount");
    if (!splitColumns) {
      const parsed = parseAmount(rawAmount);
      if (!parsed) errors.push(`Invalid amount: "${rawAmount}"`);
      else if (parsed.paise === 0) errors.push("Amount cannot be zero");
      else ({ paise: amountPaise, direction } = parsed);
    } else {
      // One of Withdrawal / Deposit holds the amount; the other is blank (or 0).
      const rawOut = get("withdrawal");
      const rawIn = get("deposit");
      const out = rawOut ? parseAmount(rawOut) : null;
      const inn = rawIn ? parseAmount(rawIn) : null;
      if (rawOut && !out) errors.push(`Invalid withdrawal amount: "${rawOut}"`);
      if (rawIn && !inn) errors.push(`Invalid deposit amount: "${rawIn}"`);
      const outPaise = out?.paise ?? 0;
      const inPaise = inn?.paise ?? 0;
      rawAmount = rawOut || rawIn;
      if (outPaise > 0 && inPaise > 0) errors.push("Both Withdrawal and Deposit have an amount — only one should");
      else if (outPaise > 0) {
        amountPaise = outPaise;
        direction = "out";
      } else if (inPaise > 0) {
        amountPaise = inPaise;
        direction = "in";
      } else if (!errors.length) errors.push("No amount in Withdrawal or Deposit");
    }

    // Determine type: an explicit Type column wins, else the amount's direction.
    let type: TransactionType = direction === "out" ? "expense" : "income";
    const rawType = get("type").toLowerCase();
    if (rawType) {
      const normalized = rawType.replace(/\s+/g, "_");
      if (isTransactionType(normalized)) type = normalized;
      else if (["debit", "dr", "withdrawal", "spent"].includes(rawType)) type = "expense";
      // A refund is money coming back in — recorded as income.
      else if (["credit", "cr", "deposit", "received", "refund"].includes(rawType)) type = "income";
      else errors.push(`Unknown transaction type: "${rawType}"`);
    }
    // A Type column is mapped but this particular cell is blank: the
    // file-wide ambiguity check above only fires when NO Type column is
    // mapped at all, so a blank cell here would otherwise fall through to
    // sign-based inference silently. Flag it instead of guessing.
    const rowTypeIsAmbiguous = hasTypeColumn && !rawType && direction === null;

    // Transfers need a destination account (see accountBalance's double-entry
    // logic), but the import mapping has no "to account" column — so a transfer
    // row would persist with transferAccountId = null and leak money out of the
    // source account with nothing arriving anywhere. Reject it explicitly rather
    // than import a balance-breaking row. (Only an explicit Type column can
    // produce "transfer"; sign inference never does.)
    if (type === "transfer") {
      errors.push("Transfers can't be imported — record them manually, or map this row as an expense/income");
    }

    if (fileIsAmbiguous) {
      errors.push("Cannot tell income from expense — map a Type column, or separate Withdrawal/Deposit columns (this file's amounts don't say which way the money went)");
    } else if (rowTypeIsAmbiguous) {
      errors.push(`Type column is blank for this row — can't tell income from expense for "${rawAmount}"`);
    }

    if (errors.length) {
      invalid.push({ index, raw, errors });
      return;
    }

    valid.push({
      index,
      type,
      amount: amountPaise,
      description,
      date: date!,
      categoryName: get("category") || null,
      accountName: get("account") || null,
      paymentMethod: normalizePaymentMethod(get("paymentMethod")),
      notes: get("notes") || null,
    });
  });

  return { valid, invalid, total: records.length };
}

/** Accepts YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, MM/DD/YYYY with optional format hint. */
export function normalizeDate(input: string, formatHint: DateFormatHint = "auto"): string | null {
  const s = input.trim();
  if (!s) return null;
  const yearFirst = /^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/.exec(s);
  if (yearFirst) {
    const [, year, month, day] = yearFirst;
    const iso = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    return fromISODate(iso) ? iso : null;
  }

  const m = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/.exec(s);
  if (m) {
    const [, a, b, y] = m;
    let year = Number(y);
    if (year < 100) year += 2000;
    const num1 = Number(a);
    const num2 = Number(b);

    let day: number;
    let month: number;

    if (formatHint === "MM/DD/YYYY") {
      month = num1;
      day = num2;
    } else if (formatHint === "DD/MM/YYYY") {
      day = num1;
      month = num2;
    } else {
      // auto fallback
      if (num1 > 12 && num2 <= 12) {
        day = num1;
        month = num2;
      } else if (num2 > 12 && num1 <= 12) {
        month = num1;
        day = num2;
      } else {
        day = num1;
        month = num2;
      }
    }

    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return fromISODate(iso) ? iso : null;
  }

  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) return toISODate(parsed);
  return null;
}

function normalizePaymentMethod(input: string): string | null {
  const s = input.trim().toLowerCase().replace(/\s+/g, "_");
  const known = ["upi", "cash"];
  return known.includes(s) ? s : null;
}

/**
 * Signature used to detect duplicate transactions on import. Includes the
 * account so two legitimately different transactions (e.g. the same
 * subscription charged the same day to two different cards) don't collide
 * just because date/amount/description match. `accountId` is optional so
 * existing callers that don't have one yet still get a (less precise) key.
 */
export function dedupeKey(input: {
  date: string;
  amount: number;
  description: string;
  type: string;
  accountId?: string;
}): string {
  return `${input.date}|${input.type}|${input.amount}|${input.description.trim().toLowerCase()}|${input.accountId ?? ""}`;
}
