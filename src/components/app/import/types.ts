import type { ImportField } from "@/lib/csv";

// ---- Types mirroring the /api/import contract -----------------------------

export interface InvalidRow {
  index: number;
  errors: string[];
  raw: Record<string, string>;
}

export interface ImportSummary {
  total: number;
  valid: number;
  invalid: number;
  invalidRows: InvalidRow[];
  duplicates: number;
  willImport: number;
  imported?: number;
}

export interface ImportResponse {
  preview: boolean;
  summary: ImportSummary;
}

export type DateFormat = "auto" | "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";

// ---- Field metadata --------------------------------------------------------

export interface FieldMeta {
  key: ImportField;
  label: string;
  required?: boolean;
  /** Substrings that hint a CSV header maps to this field. */
  hints: string[];
}

export const FIELDS: FieldMeta[] = [
  { key: "date", label: "Date", required: true, hints: ["date", "posted", "when"] },
  { key: "description", label: "Description", required: true, hints: ["desc", "narration", "details", "particular", "memo", "merchant", "name"] },
  { key: "amount", label: "Amount", required: true, hints: ["amount", "amt", "value", "debit", "credit"] },
  { key: "type", label: "Type", hints: ["type", "dr", "cr", "direction"] },
  { key: "category", label: "Category", hints: ["categ", "tag"] },
  { key: "account", label: "Account", hints: ["account", "acct", "bank", "card"] },
  { key: "paymentMethod", label: "Payment method", hints: ["payment", "method", "mode", "channel"] },
  { key: "notes", label: "Notes", hints: ["note", "remark", "comment"] },
];

export const REQUIRED_FIELDS: ImportField[] = ["date", "description", "amount"];

// Keep well under typical serverless request-body limits (e.g. Vercel's
// ~4.5MB) — the whole parsed file is sent as JSON, twice (preview + commit),
// and JSON overhead roughly doubles a CSV's raw byte size.
export const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;
// Matches the server's `records` schema cap (see /api/import) — failing fast
// client-side avoids parsing a huge file only to have the request rejected.
export const MAX_ROWS = 5000;

export type Step = 1 | 2 | 3 | 4;

export const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: "Upload" },
  { n: 2, label: "Map columns" },
  { n: 3, label: "Preview" },
  { n: 4, label: "Done" },
];
