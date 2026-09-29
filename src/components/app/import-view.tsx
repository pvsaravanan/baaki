"use client";
import { useRef, useState } from "react";
import Papa from "papaparse";
import { useToast } from "@/components/ui/toast";
import { useAppData } from "./app-data";
import { apiPost, ApiError } from "@/lib/http";
import { findHeaderRow, hasAmountMapping, recordsFromRows, type ColumnMapping, type ImportField } from "@/lib/csv";
import { pickSheet, sheetToRows } from "@/lib/spreadsheet";
import { Stepper } from "./import/stepper";
import { UploadStep } from "./import/upload-step";
import { MapStep } from "./import/map-step";
import { PreviewStep } from "./import/preview-step";
import { DoneStep } from "./import/done-step";
import { guessMapping, emptyMapping } from "./import/guess-mapping";
import {
  FIELDS,
  REQUIRED_FIELDS,
  MAX_FILE_SIZE_BYTES,
  MAX_ROWS,
  type DateFormat,
  type ImportResponse,
  type ImportSummary,
  type Step,
} from "./import/types";

export function ImportView() {
  const { accounts, refresh } = useAppData();
  const toast = useToast();

  const [step, setStep] = useState<Step>(1);
  const [fileName, setFileName] = useState("");
  const [records, setRecords] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<ImportField, string>>(emptyMapping());
  const [defaultAccountId, setDefaultAccountId] = useState<string>(accounts[0]?.id ?? "");
  const [dateFormat, setDateFormat] = useState<DateFormat>("auto");
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const [preview, setPreview] = useState<ImportSummary | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportSummary | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const requiredMapped = REQUIRED_FIELDS.every((f) => mapping[f]) && hasAmountMapping(mapping);

  // ---- File handling -------------------------------------------------------

  /**
   * Shared by CSV and Excel once the file is plain text rows: find the
   * column headings (bank statements often have account details above
   * them), build the records and guess the mapping.
   */
  function loadRows(allRows: string[][], name: string, sheetName?: string) {
    const headerIndex = findHeaderRow(allRows);
    const { headers: fields, records: rows } = recordsFromRows(allRows, headerIndex);
    if (fields.length === 0) {
      setParseError("Could not detect any columns. Make sure the file has column headings.");
      return;
    }
    if (rows.length === 0) {
      setParseError("No data rows were found in this file.");
      return;
    }
    if (rows.length > MAX_ROWS) {
      setParseError(`This file has ${rows.length} rows — up to ${MAX_ROWS} can be imported at once. Split it into smaller files.`);
      return;
    }
    setFileName(name);
    setHeaders(fields);
    setRecords(rows);
    setMapping(guessMapping(fields));
    const notes = [
      sheetName && `Using the sheet "${sheetName}".`,
      headerIndex > 0 && `Skipped ${headerIndex} line${headerIndex === 1 ? "" : "s"} above the column headings.`,
    ].filter(Boolean);
    if (notes.length) toast.info(notes.join(" "));
    setPreview(null);
    setResult(null);
  }

  async function readExcel(file: File) {
    try {
      // Loaded only when an Excel file is picked, to keep the page light.
      const { default: readXlsxFile } = await import("read-excel-file/browser");
      const sheets = (await readXlsxFile(file)).map((s) => ({
        sheet: s.sheet,
        rows: sheetToRows(s.data as Parameters<typeof sheetToRows>[0]),
      }));
      const chosen = pickSheet(sheets);
      if (!chosen) {
        setParseError("This workbook has no data.");
        return;
      }
      loadRows(chosen.rows, file.name, sheets.length > 1 ? chosen.sheet : undefined);
    } catch {
      setParseError("Could not read this Excel file. If it's password-protected, remove the password, or save it as CSV.");
    }
  }

  function handleFile(file: File | undefined | null) {
    if (!file) return;
    setParseError(null);
    // The <input accept> filter only applies to the native file picker —
    // drag-and-drop bypasses it entirely, so check the extension ourselves too.
    const isExcel = /\.xlsx$/i.test(file.name);
    const isCsv = /\.csv$/i.test(file.name) || (!isExcel && file.type === "text/csv");
    if (/\.xls$/i.test(file.name)) {
      setParseError("Older .xls files aren't supported. Open it in Excel and save as .xlsx or .csv.");
      return;
    }
    if (!isExcel && !isCsv) {
      setParseError("Please choose a .csv or .xlsx file.");
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setParseError(
        `This file is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Split it into files under ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB and import separately.`,
      );
      return;
    }
    if (isExcel) {
      void readExcel(file);
      return;
    }
    // Parse as plain rows, not with Papa's header option: the column
    // headings aren't necessarily the first line — loadRows finds them.
    Papa.parse<string[]>(file, {
      skipEmptyLines: true,
      // Large files parse off the main thread so the UI doesn't freeze.
      worker: true,
      complete: (results) => loadRows(results.data as string[][], file.name),
      error: (err) => setParseError(err.message || "Failed to parse the CSV file."),
    });
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  }

  function downloadSample() {
    const csv = [
      "Date,Description,Amount,Type,Category,Account",
      "2026-08-01,Salary for August,85000,income,Salary,HDFC Bank",
      "2026-08-02,Groceries at BigBasket,-2450.50,expense,Groceries,HDFC Bank",
      "2026-08-03,Coffee with team,-320,expense,Food,Cash",
      "05/08/2026,Electricity bill,-1899,expense,Bills & Utilities,HDFC Bank",
    ].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "baaki-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function reset() {
    setStep(1);
    setFileName("");
    setRecords([]);
    setHeaders([]);
    setMapping(emptyMapping());
    setDateFormat("auto");
    setSkipDuplicates(true);
    setParseError(null);
    setPreview(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ---- API calls -----------------------------------------------------------

  function buildMapping(): ColumnMapping {
    const out: ColumnMapping = {};
    for (const f of FIELDS) {
      if (mapping[f.key]) out[f.key] = mapping[f.key];
    }
    return out;
  }

  function body(commit: boolean) {
    return {
      records,
      mapping: buildMapping(),
      commit,
      defaultAccountId: defaultAccountId || null,
      skipDuplicates,
      dateFormat,
    };
  }

  async function runPreview() {
    setPreviewing(true);
    try {
      const res = await apiPost<ImportResponse>("/api/import", body(false));
      setPreview(res.summary);
      setStep(3);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not validate the file.");
    } finally {
      setPreviewing(false);
    }
  }

  async function runImport() {
    setImporting(true);
    try {
      const res = await apiPost<ImportResponse>("/api/import", body(true));
      setResult(res.summary);
      setStep(4);
      refresh();
      toast.success(
        `Imported ${res.summary.imported ?? res.summary.willImport} transaction${
          (res.summary.imported ?? res.summary.willImport) === 1 ? "" : "s"
        }.`,
      );
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Import failed. Please try again.");
    } finally {
      setImporting(false);
    }
  }

  // ---- Render --------------------------------------------------------------

  return (
    <div className="space-y-5">
      <Stepper current={step} />

      {step === 1 && (
        <UploadStep
          fileName={fileName}
          recordCount={records.length}
          dragging={dragging}
          parseError={parseError}
          fileInputRef={fileInputRef}
          onPick={() => fileInputRef.current?.click()}
          onFile={handleFile}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onDownloadSample={downloadSample}
          onContinue={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <MapStep
          headers={headers}
          mapping={mapping}
          setMapping={setMapping}
          dateFormat={dateFormat}
          setDateFormat={setDateFormat}
          accounts={accounts}
          defaultAccountId={defaultAccountId}
          setDefaultAccountId={setDefaultAccountId}
          skipDuplicates={skipDuplicates}
          setSkipDuplicates={setSkipDuplicates}
          recordCount={records.length}
          requiredMapped={requiredMapped}
          previewing={previewing}
          onBack={() => setStep(1)}
          onPreview={runPreview}
        />
      )}

      {step === 3 && preview && (
        <PreviewStep
          summary={preview}
          records={records}
          mapping={mapping}
          importing={importing}
          onBack={() => setStep(2)}
          onImport={runImport}
        />
      )}

      {step === 4 && result && <DoneStep summary={result} onReset={reset} />}
    </div>
  );
}
