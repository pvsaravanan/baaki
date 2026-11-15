/**
 * Excel (.xlsx) support for Import. A sheet is turned into the same plain
 * text rows a CSV produces, so everything after that — finding the heading
 * row, mapping columns, Withdrawal/Deposit, Dr/Cr — is shared.
 */
import { findHeaderRow } from "./csv";

type Cell = string | number | boolean | Date | null | undefined;

/** One cell as text. Dates become YYYY-MM-DD; numbers keep full precision. */
export function cellText(cell: Cell): string {
  if (cell == null) return "";
  if (cell instanceof Date) {
    if (Number.isNaN(cell.getTime())) return "";
    // Spreadsheet dates have no time zone; the reader hands them over as UTC.
    const y = cell.getUTCFullYear();
    const m = String(cell.getUTCMonth() + 1).padStart(2, "0");
    const d = String(cell.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof cell === "number") {
    // Avoid float noise like 1200.1000000000001 and exponent notation.
    return Number.isInteger(cell) ? String(cell) : String(Math.round(cell * 1e6) / 1e6);
  }
  return String(cell);
}

export function sheetToRows(data: Cell[][]): string[][] {
  return data.map((row) => row.map(cellText));
}

/**
 * Which sheet to import: the first one that has column headings (a workbook
 * may start with a cover or summary sheet), else the first with any data.
 */
export function pickSheet<T extends { sheet: string; rows: string[][] }>(sheets: T[]): T | null {
  const withData = sheets.filter((s) => s.rows.some((r) => r.some((c) => c.trim() !== "")));
  const withHeadings = withData.find((s) => {
    const i = findHeaderRow(s.rows);
    return i > 0 || /date/i.test(s.rows[0]?.join(" ") ?? "");
  });
  return withHeadings ?? withData[0] ?? null;
}
