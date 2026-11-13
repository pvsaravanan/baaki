"use client";
import { useState } from "react";
import { apiPost, ApiError } from "@/lib/http";
import { BackupOpenError, decryptBackup, isEncryptedBackup } from "@/lib/backup-crypto";
import { useAppData } from "@/components/app/app-data";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import { BackupPasswordModal } from "./backup-password-modal";

/** Whether a file looks like a baaki full backup (rather than a CSV or Excel statement). */
export function isBackupFileName(name: string): boolean {
  return /\.(baaki|json)$/i.test(name);
}

/**
 * Restoring a baaki full backup: read the file, ask for its password when it's
 * locked, confirm that it replaces everything, then restore. Shared by
 * Settings → Data & backup and the Import screen, so a backup is accepted in
 * either place. Render `passwordModal` once next to whatever calls `restoreFile`.
 */
export function useBackupRestore(onRestored?: () => void) {
  const { refresh } = useAppData();
  const { success, error } = useToast();
  const confirm = useConfirm();

  const [restoring, setRestoring] = useState(false);
  const [locked, setLocked] = useState<Uint8Array | null>(null);
  const [opening, setOpening] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  function closePassword() {
    setLocked(null);
    setPasswordError(null);
  }

  /** Asks to replace everything with this backup, then does it. `wasLocked` backups were opened with a password. */
  async function restore(backup: unknown, wasLocked: boolean) {
    const ok = await confirm({
      title: "Restore this backup?",
      message:
        (wasLocked ? "" : "This file isn't password-protected, so anyone could have changed it. ") +
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
      onRestored?.();
    } catch (e) {
      error(e instanceof ApiError ? e.message : "Could not restore the backup");
    } finally {
      setRestoring(false);
    }
  }

  /** Reads a picked backup file and carries it through to a restore. */
  async function restoreFile(file: File) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (isEncryptedBackup(bytes)) {
      setLocked(bytes);
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
    await restore(backup, false);
  }

  async function openLocked(password: string) {
    if (!locked) return;
    setOpening(true);
    setPasswordError(null);
    try {
      const backup = JSON.parse(await decryptBackup(locked, password));
      closePassword();
      await restore(backup, true);
    } catch (e) {
      setPasswordError(e instanceof BackupOpenError ? e.message : "That file isn't a baaki backup.");
    } finally {
      setOpening(false);
    }
  }

  const passwordModal = (
    <BackupPasswordModal
      mode={locked ? "open" : null}
      busy={opening}
      error={passwordError}
      onClose={closePassword}
      onSubmit={openLocked}
    />
  );

  return { restoreFile, restoring, passwordModal };
}
