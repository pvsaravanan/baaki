"use client";
import { useRef, useState } from "react";
import { Database, Download, FileSpreadsheet, History, Upload } from "lucide-react";
import { apiGet, apiPost, ApiError } from "@/lib/http";
import { saveFile } from "@/lib/save-file";
import { BackupOpenError, decryptBackup, encryptBackup, isEncryptedBackup } from "@/lib/backup-crypto";
import { useAppData } from "@/components/app/app-data";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import { ExportModal } from "../export-modal";
import { BackupPasswordModal } from "./backup-password-modal";
import { ActionRow, Section } from "./layout";

export function DataSection() {
  const { refresh } = useAppData();
  const { success, error } = useToast();
  const confirm = useConfirm();

  const [showExport, setShowExport] = useState(false);
  // The password box: making a backup (create) or opening a locked one (open, with its bytes).
  const [passwordFor, setPasswordFor] = useState<{ kind: "create" } | { kind: "open"; bytes: Uint8Array } | null>(null);
  const [working, setWorking] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  function closePassword() {
    setPasswordFor(null);
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
  const [restoring, setRestoring] = useState(false);

  /** Asks to replace everything with this backup, then does it. `locked` backups were opened with a password. */
  async function restoreBackup(backup: unknown, locked: boolean) {
    const ok = await confirm({
      title: "Restore this backup?",
      message:
        (locked
          ? ""
          : "This file isn't password-protected, so anyone could have changed it. ") +
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

  async function handleRestoreSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // let the same file be picked again later
    if (!file) return;
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (isEncryptedBackup(bytes)) {
      setPasswordFor({ kind: "open", bytes });
      return;
    }
    // Older backups (and the baaki website's) are plain JSON.
    let backup: unknown;
    try {
      backup = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      error("That file isn't a baaki backup.");
      return;
    }
    await restoreBackup(backup, false);
  }

  async function openBackup(bytes: Uint8Array, password: string) {
    setWorking(true);
    setPasswordError(null);
    try {
      const backup = JSON.parse(await decryptBackup(bytes, password));
      closePassword();
      await restoreBackup(backup, true);
    } catch (e) {
      setPasswordError(e instanceof BackupOpenError ? e.message : "That file isn't a baaki backup.");
    } finally {
      setWorking(false);
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
          description="Everything — accounts, transactions and budgets — in one file, locked with a password you choose."
          onClick={() => setPasswordFor({ kind: "create" })}
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
        mode={passwordFor?.kind ?? null}
        busy={working}
        error={passwordError}
        onClose={closePassword}
        onSubmit={(password) => (passwordFor?.kind === "open" ? openBackup(passwordFor.bytes, password) : createBackup(password))}
      />
    </>
  );
}
