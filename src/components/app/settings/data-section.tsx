"use client";
import { useRef, useState } from "react";
import { ChevronRight, Database, Download, FileSpreadsheet, History, Upload } from "lucide-react";
import { apiPost, ApiError, downloadFile } from "@/lib/http";
import { useAppData } from "@/components/app/app-data";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import { ExportModal } from "../export-modal";
import { ActionRow, Section } from "./layout";

export function DataSection() {
  const { refresh } = useAppData();
  const { success, error } = useToast();
  const confirm = useConfirm();

  const [showExport, setShowExport] = useState(false);
  const [downloadingBackup, setDownloadingBackup] = useState(false);

  async function handleBackupDownload() {
    setDownloadingBackup(true);
    await downloadFile("/api/export?format=json", (message) => error(message));
    setDownloadingBackup(false);
  }

  const restoreRef = useRef<HTMLInputElement>(null);
  const [restoring, setRestoring] = useState(false);

  async function handleRestoreSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // let the same file be picked again later
    if (!file) return;
    let backup: unknown;
    try {
      backup = JSON.parse(await file.text());
    } catch {
      error("That file isn't a baaki backup.");
      return;
    }
    const ok = await confirm({
      title: "Restore this backup?",
      message:
        "Everything in baaki on this phone will be replaced with the backup's contents. Make a backup first if you want to keep what's here now.",
      confirmLabel: "Restore",
      danger: true,
    });
    if (!ok) return;
    setRestoring(true);
    try {
      const res = await apiPost<{ accounts: number; transactions: number }>("/api/backup/restore", backup);
      success(`Restored ${res.transactions} transactions across ${res.accounts} accounts`);
      refresh();
    } catch (e2) {
      error(e2 instanceof ApiError ? e2.message : "Could not restore the backup");
    } finally {
      setRestoring(false);
    }
  }

  return (
    <>
      <Section
        id="data"
        title="Data & backup"
        description="Everything is stored only on this phone. Back it up to Drive or another safe place now and then — it's the only copy."
      >
        <ActionRow
          icon={<Database className="h-5 w-5" aria-hidden />}
          title="Full backup"
          description="Everything — accounts, transactions, budgets, goals, people and splits — as one JSON file."
          onClick={handleBackupDownload}
          busy={downloadingBackup}
          trailing={<Download className="h-4 w-4" aria-hidden />}
        />
        <ActionRow
          icon={<History className="h-5 w-5" aria-hidden />}
          title="Restore from backup"
          description="Replace what's here with a baaki backup — from this app or the baaki website."
          onClick={() => restoreRef.current?.click()}
          busy={restoring}
          trailing={<Upload className="h-4 w-4" aria-hidden />}
        />
        <input
          ref={restoreRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleRestoreSelected}
        />
        <ActionRow
          icon={<FileSpreadsheet className="h-5 w-5" aria-hidden />}
          title="Export transactions"
          description="A CSV for a date range, ready for a spreadsheet."
          onClick={() => setShowExport(true)}
          trailing={<Download className="h-4 w-4" aria-hidden />}
        />
        <ActionRow
          icon={<Upload className="h-5 w-5" aria-hidden />}
          title="Import transactions"
          description="Bring in a bank statement (CSV or Excel)."
          href="/import"
          trailing={<ChevronRight className="h-4 w-4" aria-hidden />}
        />
      </Section>
      <ExportModal open={showExport} onClose={() => setShowExport(false)} />
    </>
  );
}
