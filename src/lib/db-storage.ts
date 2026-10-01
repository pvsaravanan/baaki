/**
 * Where the on-device database lives (shared by the database worker and the
 * "erase everything" recovery path).
 */

/** Folder in the app's private file system (OPFS). */
export const DATA_DIR = "baaki";

/** The IndexedDB store early (pre-release) builds used; removed with the rest when erasing. */
export const LEGACY_IDB_NAME = "/pglite/baaki";

/**
 * Delete the database files (and any old IndexedDB copy). Only call once the
 * database is closed — its files are held open while it runs.
 */
export async function removeStoredData(): Promise<void> {
  const root = await navigator.storage.getDirectory();
  await root.removeEntry(DATA_DIR, { recursive: true }).catch(() => undefined);
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(LEGACY_IDB_NAME);
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  });
}
