"use client";
import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { downloadFile } from "@/lib/http";

/** Downloads all transactions as a CSV file. */
export function ExportButton() {
  const [downloading, setDownloading] = useState(false);
  const toast = useToast();

  async function handleExport() {
    setDownloading(true);
    await downloadFile("/api/export?format=csv", (message) => toast.error(message));
    setDownloading(false);
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={downloading}
      aria-label="Export CSV"
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border text-fg transition-colors hover:bg-surface-2 active:bg-surface-2 disabled:opacity-50 print:hidden"
    >
      {downloading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
    </button>
  );
}
