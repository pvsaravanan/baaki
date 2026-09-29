import { ArrowLeft, ArrowRight } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { SelectMenu } from "@/components/ui/select-menu";
import { hasAmountMapping, type ImportField } from "@/lib/csv";
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
            <Field key={f.key} label={f.label} required={f.required} hint={f.hint} htmlFor={`map-${f.key}`}>
              <SelectMenu
                id={`map-${f.key}`}
                value={mapping[f.key]}
                invalid={(f.required && !mapping[f.key]) || (f.amountChoice && !hasAmountMapping(mapping))}
                onChange={(v) => setMapping((m) => ({ ...m, [f.key]: v }))}
                options={[{ value: "", label: "— Not mapped —" }, ...headers.map((h) => ({ value: h, label: h }))]}
              />
            </Field>
          ))}
        </div>

        <div className="grid gap-4 border-t border-border pt-5 sm:grid-cols-3">
          <Field
            label="Date format"
            htmlFor="date-format"
            hint="How dates are written in your CSV."
          >
            <SelectMenu
              id="date-format"
              value={dateFormat}
              onChange={(v) => setDateFormat(v as DateFormat)}
              options={[
                { value: "auto", label: "Auto-detect format" },
                { value: "DD/MM/YYYY", label: "DD/MM/YYYY (e.g. 31/07/2026)" },
                { value: "MM/DD/YYYY", label: "MM/DD/YYYY (e.g. 07/31/2026)" },
                { value: "YYYY-MM-DD", label: "YYYY-MM-DD (e.g. 2026-07-31)" },
              ]}
            />
          </Field>

          <Field
            label="Default account"
            htmlFor="default-account"
            hint="Used when account is blank or unmapped."
          >
            {accounts.length === 0 ? (
              <p className="text-sm text-muted">No accounts yet — create one first.</p>
            ) : (
              <SelectMenu
                id="default-account"
                value={defaultAccountId}
                onChange={setDefaultAccountId}
                options={accounts.map((a) => ({ value: a.id, label: a.name }))}
              />
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
            Map Date, Description and the amount — either one Amount column, or the Withdrawal and Deposit columns — to continue.
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
