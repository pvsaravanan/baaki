"use client";
import { useRef, useState } from "react";
import { Database, Download, FileSpreadsheet, History, Upload } from "lucide-react";
import { apiGet, ApiError } from "@/lib/http";
import { saveFile } from "@/lib/save-file";
import { encryptBackup } from "@/lib/backup-crypto";
import { ExportModal } from "../export-modal";
import { BackupPasswordModal } from "./backup-password-modal";
import { useBackupRestore } from "./use-backup-restore";
import { ActionRow, Section } from "./layout";

export function DataSection() {
  const [showExport, setShowExport] = useState(false);
  // The password box for making a backup.
  const [creating, setCreating] = useState(false);
  const [working, setWorking] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  function closePassword() {
    setCreating(false);
    setPasswordError(null);
  }

  /** Makes the backup file, locked with the password, and hands it to the share sheet. */
  async function createBackup(password: string) {
    setWorking(true);
    setPasswordError(null);
    try {
      const backup = await apiGet<unknown>("/api/export?format=json");
      const locked = await encryptBackup(JSON.stringify(backup), password);
      const stamp = new Date().toISOString().slice(0, 10);
      const saved = await saveFile(`baaki-backup-${stamp}.baaki`, new Blob([locked.slice().buffer as ArrayBuffer], { type: "application/octet-stream" }));
      if (saved) closePassword();
    } catch (e) {
      setPasswordError(e instanceof ApiError ? e.message : "Could not create the backup. Please try again.");
    } finally {
      setWorking(false);
    }
  }

  const restoreRef = useRef<HTMLInputElement>(null);
  const { restoreFile, restoring, passwordModal: restoreModal } = useBackupRestore();

  function handleRestoreSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // let the same file be picked again later
    if (file) void restoreFile(file);
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
          description="Everything — accounts, transactions and budgets — in one file, locked with a password you choose."
          onClick={() => setCreating(true)}
          trailing={<Download className="h-4 w-4" aria-hidden />}
        />
        <ActionRow
          icon={<History className="h-5 w-5" aria-hidden />}
          title="Restore from backup"
          description="Replace what's here with a baaki backup. A locked one asks for its password."
          onClick={() => restoreRef.current?.click()}
          busy={restoring}
          trailing={<Upload className="h-4 w-4" aria-hidden />}
        />
        <input
          ref={restoreRef}
          type="file"
          accept=".baaki,.json,application/json,application/octet-stream"
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
      </Section>
      <ExportModal open={showExport} onClose={() => setShowExport(false)} />
      <BackupPasswordModal
        mode={creating ? "create" : null}
        busy={working}
        error={passwordError}
        onClose={closePassword}
        onSubmit={createBackup}
      />
      {restoreModal}
    </>
  );
}
