import { ArrowLeft, ArrowRight } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import type { ImportField } from "@/lib/csv";
import { FIELDS, type DateFormat } from "./types";

export function MapStep({
  headers,
  mapping,
  setMapping,
  dateFormat,
  setDateFormat,
  accounts,
  defaultAccountId,
  setDefaultAccountId,
  skipDuplicates,
  setSkipDuplicates,
  recordCount,
  requiredMapped,
  previewing,
  onBack,
  onPreview,
}: {
  headers: string[];
  mapping: Record<ImportField, string>;
  setMapping: React.Dispatch<React.SetStateAction<Record<ImportField, string>>>;
  dateFormat: DateFormat;
  setDateFormat: (v: DateFormat) => void;
  accounts: { id: string; name: string }[];
  defaultAccountId: string;
  setDefaultAccountId: (id: string) => void;
  skipDuplicates: boolean;
  setSkipDuplicates: (v: boolean) => void;
  recordCount: number;
  requiredMapped: boolean;
  previewing: boolean;
  onBack: () => void;
  onPreview: () => void;
}) {
  return (
    <Card>
      <CardHeader
        title="Map your columns"
        subtitle={`Match your CSV headers to baaki fields. ${recordCount} row${recordCount === 1 ? "" : "s"} to import.`}
      />
      <CardBody className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <Field key={f.key} label={f.label} required={f.required} htmlFor={`map-${f.key}`}>
              <Select
                id={`map-${f.key}`}
                value={mapping[f.key]}
                invalid={f.required && !mapping[f.key]}
                onChange={(e) => setMapping((m) => ({ ...m, [f.key]: e.target.value }))}
              >
                <option value="">— Not mapped —</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </Select>
            </Field>
          ))}
        </div>

        <div className="grid gap-4 border-t border-border pt-5 sm:grid-cols-3">
          <Field
            label="Date format"
            htmlFor="date-format"
            hint="How dates are written in your CSV."
          >
            <Select
              id="date-format"
              value={dateFormat}
              onChange={(e) => setDateFormat(e.target.value as DateFormat)}
            >
              <option value="auto">Auto-detect format</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 31/07/2026)</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 07/31/2026)</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-07-31)</option>
            </Select>
          </Field>

          <Field
            label="Default account"
            htmlFor="default-account"
            hint="Used when account is blank or unmapped."
          >
            {accounts.length === 0 ? (
              <p className="text-sm text-muted">No accounts yet — create one first.</p>
            ) : (
              <Select
                id="default-account"
                value={defaultAccountId}
                onChange={(e) => setDefaultAccountId(e.target.value)}
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="Duplicates">
            <label className="flex cursor-pointer items-start gap-2.5 rounded-none border border-border bg-surface px-3 py-2.5 text-sm">
              <input
                type="checkbox"
                checked={skipDuplicates}
                onChange={(e) => setSkipDuplicates(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-brand"
              />
              <span>
                <span className="font-medium text-fg">Skip duplicates</span>
                <span className="mt-0.5 block text-xs text-muted">
                  Skip existing transactions.
                </span>
              </span>
            </label>
          </Field>
        </div>

        {!requiredMapped && (
          <p className="text-xs text-muted">
            Map the required fields (Date, Description, Amount) to continue.
          </p>
        )}
      </CardBody>
      <div className="flex justify-between gap-2 border-t border-border px-5 py-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button onClick={onPreview} disabled={!requiredMapped || previewing} loading={previewing}>
          Preview
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
