import { Upload, FileText, Download, ArrowRight, AlertCircle } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { cn } from "@/lib/cn";

export function UploadStep({
  fileName,
  recordCount,
  dragging,
  parseError,
  fileInputRef,
  onPick,
  onFile,
  onDragOver,
  onDragLeave,
  onDrop,
  onDownloadSample,
  onContinue,
}: {
  fileName: string;
  recordCount: number;
  dragging: boolean;
  parseError: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onPick: () => void;
  onFile: (f: File | undefined | null) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDownloadSample: () => void;
  onContinue: () => void;
}) {
  const hasFile = recordCount > 0;
  return (
    <Card>
      <CardHeader
        title="Upload a CSV file"
        subtitle="Your file should have a header row. We'll help you map the columns next."
        action={
          <Button variant="outline" size="sm" onClick={onDownloadSample}>
            <Download className="h-4 w-4" />
            Sample CSV
          </Button>
        }
      />
      <CardBody className="space-y-4">
        <div
          role="button"
          tabIndex={0}
          onClick={onPick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onPick();
            }
          }}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-none border-2 border-dashed px-6 py-12 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
            dragging ? "border-brand bg-brand-soft" : "border-border bg-surface-2/50 hover:border-border-strong",
          )}
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-none bg-surface-2 text-muted">
            <Upload className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-fg">
            Drag &amp; drop your CSV here, or <span className="text-brand-hover">browse</span>
          </p>
          <p className="text-xs text-muted">Only .csv files are supported</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </div>

        {parseError && (
          <div className="flex items-start gap-2 rounded-none border border-expense/30 bg-expense/10 px-3 py-2 text-sm text-expense">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{parseError}</span>
          </div>
        )}

        {hasFile && (
          <div className="flex flex-wrap items-center gap-3 rounded-none border border-border bg-surface-2 px-4 py-3">
            <FileText className="h-5 w-5 text-brand-hover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-fg">{fileName}</p>
              <p className="text-xs text-muted">
                {recordCount} row{recordCount === 1 ? "" : "s"} detected
              </p>
            </div>
            <Badge tone="brand">Ready</Badge>
          </div>
        )}
      </CardBody>
      <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
        <Button onClick={onContinue} disabled={!hasFile}>
          Map columns
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
