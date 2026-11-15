/**
 * Locks a backup with a password, so the file can't be read or edited by hand.
 *
 * AES-256-GCM encrypts it and also seals it: change any byte, or use the wrong
 * password, and opening it fails. The key comes from the password with
 * PBKDF2-SHA-256 and a random salt, so there's nothing stored on the phone —
 * a backup opens on any phone, after a reinstall, for whoever has the password.
 * (A key kept only in the phone would be lost with the app, which is when a
 * backup is needed most.)
 *
 * File layout, all binary:
 *   "BAAKIBK1" (8 bytes, also covered by the seal) | iterations (4, big-endian)
 *   | salt (16) | iv (12) | ciphertext + 16-byte tag
 */
const MAGIC = new TextEncoder().encode("BAAKIBK1");
const ITERATIONS = 600_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const HEADER_BYTES = MAGIC.length + 4 + SALT_BYTES + IV_BYTES;
const TAG_BYTES = 16;
/** A file asking for far more work than this isn't one baaki wrote. */
const MAX_ITERATIONS = 5_000_000;

export const MIN_PASSWORD_LENGTH = 8;

/** Thrown when a backup can't be opened: wrong password, or the file was changed. */
export class BackupOpenError extends Error {
  constructor() {
    super("Wrong password, or the backup file was changed.");
    this.name = "BackupOpenError";
  }
}

/** Whether these bytes are a password-locked baaki backup (as opposed to a plain JSON one). */
export function isEncryptedBackup(bytes: Uint8Array): boolean {
  return bytes.length >= MAGIC.length && MAGIC.every((b, i) => bytes[i] === b);
}

const toBuffer = (bytes: Uint8Array): ArrayBuffer => bytes.slice().buffer as ArrayBuffer;

async function deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey("raw", toBuffer(new TextEncoder().encode(password)), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: toBuffer(salt), iterations, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptBackup(plain: string, password: string, iterations = ITERATIONS): Promise<Uint8Array> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(password, salt, iterations);
  const sealed = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: toBuffer(iv), additionalData: toBuffer(MAGIC) },
      key,
      toBuffer(new TextEncoder().encode(plain)),
    ),
  );
  const out = new Uint8Array(HEADER_BYTES + sealed.length);
  out.set(MAGIC, 0);
  new DataView(out.buffer).setUint32(MAGIC.length, iterations);
  out.set(salt, MAGIC.length + 4);
  out.set(iv, MAGIC.length + 4 + SALT_BYTES);
  out.set(sealed, HEADER_BYTES);
  return out;
}

/** Opens a locked backup. Throws BackupOpenError for a wrong password or a changed file. */
export async function decryptBackup(bytes: Uint8Array, password: string): Promise<string> {
  if (!isEncryptedBackup(bytes) || bytes.length < HEADER_BYTES + TAG_BYTES) throw new BackupOpenError();
  const iterations = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(MAGIC.length);
  if (iterations < 1 || iterations > MAX_ITERATIONS) throw new BackupOpenError();
  const salt = bytes.slice(MAGIC.length + 4, MAGIC.length + 4 + SALT_BYTES);
  const iv = bytes.slice(MAGIC.length + 4 + SALT_BYTES, HEADER_BYTES);
  try {
    const key = await deriveKey(password, salt, iterations);
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: toBuffer(iv), additionalData: toBuffer(MAGIC) },
      key,
      toBuffer(bytes.slice(HEADER_BYTES)),
    );
    return new TextDecoder().decode(plain);
  } catch {
    throw new BackupOpenError();
  }
}
