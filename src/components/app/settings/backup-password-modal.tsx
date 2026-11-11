"use client";
import { useEffect, useState } from "react";
import { MIN_PASSWORD_LENGTH } from "@/lib/backup-crypto";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";

/**
 * Asks for the password that locks a backup (`create`: twice, so a typo can't
 * lock you out of your own file) or opens one (`open`).
 */
export function BackupPasswordModal({
  mode,
  busy,
  error,
  onSubmit,
  onClose,
}: {
  /** Null keeps the modal closed. */
  mode: "create" | "open" | null;
  busy: boolean;
  /** A problem from the last try, e.g. a wrong password. */
  error: string | null;
  onSubmit: (password: string) => void;
  onClose: () => void;
}) {
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  // A message from a failed try goes away once the password is edited.
  const [edited, setEdited] = useState(false);
  useEffect(() => {
    setPassword("");
    setAgain("");
  }, [mode]);
  useEffect(() => setEdited(false), [error]);

  const creating = mode === "create";
  const tooShort = creating && password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
  const mismatch = creating && again.length > 0 && again !== password;
  const ready = creating ? password.length >= MIN_PASSWORD_LENGTH && again === password : password.length > 0;
  const problem = tooShort
    ? `Use at least ${MIN_PASSWORD_LENGTH} characters.`
    : mismatch
      ? "The passwords don't match."
      : edited
        ? null
        : error;
  const submit = () => {
    if (!ready || busy) return;
    onSubmit(password);
  };

  return (
    <Modal
      open={mode !== null}
      onClose={onClose}
      busy={busy}
      title={creating ? "Lock this backup" : "Open this backup"}
      description={
        creating
          ? "Choose a password. Without it nobody can read or change the file, and baaki can't recover it for you."
          : "This backup is locked. Enter the password you chose when you made it."
      }
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} loading={busy} disabled={!ready}>
            {creating ? "Create backup" : "Open backup"}
          </Button>
        </div>
      }
    >
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Field label={creating ? "Password" : "Backup password"} htmlFor="backup-password">
          <Input
            id="backup-password"
            type="password"
            autoComplete={creating ? "new-password" : "current-password"}
            value={password}
            autoFocus
            onChange={(e) => {
              setPassword(e.target.value);
              setEdited(true);
            }}
            invalid={Boolean(problem) && !mismatch}
          />
        </Field>
        {creating && (
          <Field label="Type it again" htmlFor="backup-password-again">
            <Input
              id="backup-password-again"
              type="password"
              autoComplete="new-password"
              value={again}
              onChange={(e) => setAgain(e.target.value)}
              invalid={mismatch}
            />
          </Field>
        )}
        {problem && (
          <p role="alert" className="text-xs text-expense">
            {problem}
          </p>
        )}
      </form>
    </Modal>
  );
}
