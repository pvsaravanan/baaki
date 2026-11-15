import { describe, expect, it } from "vitest";
import { BackupOpenError, decryptBackup, encryptBackup, isEncryptedBackup } from "./backup-crypto";

// A few iterations keep the tests quick; the real default is much higher.
const FAST = 1_000;
const sample = JSON.stringify({ app: "baaki", version: 2, transactions: [{ id: "t1", amount: 12345, description: "₹ Chai" }] });

describe("backup encryption", () => {
  it("opens with the same password and returns the exact text", async () => {
    const file = await encryptBackup(sample, "correct horse", FAST);
    expect(await decryptBackup(file, "correct horse")).toBe(sample);
  });

  it("is recognised as locked, and the text isn't readable in the file", async () => {
    const file = await encryptBackup(sample, "correct horse", FAST);
    expect(isEncryptedBackup(file)).toBe(true);
    expect(new TextDecoder("latin1").decode(file)).not.toContain("transactions");
    expect(isEncryptedBackup(new TextEncoder().encode(sample))).toBe(false);
  });

  it("refuses a wrong password", async () => {
    const file = await encryptBackup(sample, "correct horse", FAST);
    await expect(decryptBackup(file, "wrong horse")).rejects.toBeInstanceOf(BackupOpenError);
  });

  it("refuses a file with any byte changed", async () => {
    const file = await encryptBackup(sample, "correct horse", FAST);
    for (const at of [3, 12, 20, 40, file.length - 1]) {
      const edited = file.slice();
      edited[at] ^= 1;
      await expect(decryptBackup(edited, "correct horse")).rejects.toBeInstanceOf(BackupOpenError);
    }
  });

  it("refuses a truncated or unrelated file", async () => {
    const file = await encryptBackup(sample, "correct horse", FAST);
    await expect(decryptBackup(file.slice(0, 30), "correct horse")).rejects.toBeInstanceOf(BackupOpenError);
    await expect(decryptBackup(new TextEncoder().encode(sample), "x")).rejects.toBeInstanceOf(BackupOpenError);
  });

  it("gives a different file every time, for the same text and password", async () => {
    const a = await encryptBackup(sample, "correct horse", FAST);
    const b = await encryptBackup(sample, "correct horse", FAST);
    expect(a).not.toEqual(b);
  });
});
