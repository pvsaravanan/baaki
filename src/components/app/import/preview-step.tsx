import { ArrowLeft, AlertCircle, X } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { cn } from "@/lib/cn";
import type { ImportField } from "@/lib/csv";
import { FIELDS, type ImportSummary } from "./types";

export function PreviewStep({
  summary,
  records,
  mapping,
  importing,
  onBack,
  onImport,
}: {
  summary: ImportSummary;
  records: Record<string, string>[];
  mapping: Record<ImportField, string>;
  importing: boolean;
  onBack: () => void;
  onImport: () => void;
}) {
  const previewFields = FIELDS.filter((f) => mapping[f.key]);
  const previewRows = records.slice(0, 8);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Valid rows" value={summary.valid} tone="income" />
        <StatTile label="Invalid rows" value={summary.invalid} tone={summary.invalid ? "expense" : "muted"} />
        <StatTile label="Duplicates" value={summary.duplicates} tone={summary.duplicates ? "warning" : "muted"} />
        <StatTile label="Will import" value={summary.willImport} tone="brand" />
      </div>

      {summary.willImport === 0 && (
        <div className="flex items-start gap-2 rounded-none border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Nothing will be imported. This can happen if every row is invalid or a duplicate, or if no account
            is available to attach transactions to.
          </span>
        </div>
      )}

      {previewFields.length > 0 && (
        <Card>
          <CardHeader
            title="Preview"
            subtitle={`First ${previewRows.length} of ${records.length} row${records.length === 1 ? "" : "s"}, showing your mapped columns.`}
          />
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted">
                    {previewFields.map((f) => (
                      <th key={f.key} className="whitespace-nowrap px-4 py-2 font-medium">
                        {f.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {previewRows.map((row, i) => (
                    <tr key={i}>
                      {previewFields.map((f) => (
                        <td key={f.key} className="max-w-[220px] truncate px-4 py-2 text-fg">
                          {row[mapping[f.key]] || <span className="text-faint">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {summary.invalidRows.length > 0 && (
        <Card>
          <CardHeader
            title="Rows that won't import"
            subtitle="Fix these in your CSV and re-upload to include them."
            action={<Badge tone="expense">{summary.invalid}</Badge>}
          />
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted">
                    <th className="px-4 py-2 font-medium">Row</th>
                    <th className="px-4 py-2 font-medium">Problem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {summary.invalidRows.map((r) => (
                    <tr key={r.index}>
                      <td className="whitespace-nowrap px-4 py-2 tabular-nums text-muted">#{r.index + 2}</td>
                      <td className="px-4 py-2">
                        <ul className="space-y-0.5">
                          {r.errors.map((err, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-expense">
                              <X className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                              <span>{err}</span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {summary.invalid > summary.invalidRows.length && (
              <p className="border-t border-border px-4 py-2 text-xs text-muted">
                Showing {summary.invalidRows.length} of {summary.invalid} invalid rows.
              </p>
            )}
          </CardBody>
        </Card>
      )}

      <div className="flex justify-between gap-2">
        <Button variant="outline" onClick={onBack} disabled={importing}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button onClick={onImport} disabled={summary.willImport === 0 || importing} loading={importing}>
          {importing
            ? "Importing…"
            : `Import ${summary.willImport} transaction${summary.willImport === 1 ? "" : "s"}`}
        </Button>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "income" | "expense" | "warning" | "brand" | "muted";
}) {
  const colors: Record<string, string> = {
    income: "text-income",
    expense: "text-expense",
    warning: "text-warning",
    brand: "text-brand-hover",
    muted: "text-faint",
  };
  return (
    <div className="rounded-none border border-border bg-surface p-4 shadow-card">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className={cn("mt-1.5 text-2xl font-semibold tabular-nums", colors[tone])}>{value}</p>
    </div>
  );
}
