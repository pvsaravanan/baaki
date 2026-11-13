/// <reference lib="webworker" />
import { PGlite } from "@electric-sql/pglite";
import { OpfsAhpFS } from "@electric-sql/pglite/opfs-ahp";
import { worker } from "@electric-sql/pglite/worker";
import { DATA_DIR, DB_RELEASED, RELEASE_DB } from "./db-storage";

/**
 * The on-device database runs in this worker, stored in the app's private
 * file system (OPFS) through sync access handles. Postgres writes ordinary
 * files there, page by page, and recovers from its write-ahead log if the
 * app is killed mid-write — unlike IndexedDB (used by early builds), where
 * one interrupted write of a large record could leave the whole database
 * unreadable.
 */
/**
 * Older Android WebViews (Chrome < ~120) refuse, in a sync access handle's
 * read/write, a view over memory that isn't a plain ArrayBuffer ("parameter 1
 * is not of type 'ArrayBufferView'"), which leaves the database unable to
 * open. Go through a plain copy in that case.
 */
function patchAccessHandle() {
  const proto = globalThis.FileSystemSyncAccessHandle?.prototype;
  if (!proto) return;
  const read = proto.read;
  const write = proto.write;
  const plain = (v: unknown) => ArrayBuffer.isView(v) && v.buffer instanceof ArrayBuffer;
  const bytes = (v: unknown) =>
    ArrayBuffer.isView(v) ? new Uint8Array(v.buffer, v.byteOffset, v.byteLength) : new Uint8Array(v as ArrayBufferLike);
  proto.read = function (this: FileSystemSyncAccessHandle, view: ArrayBufferView, opts?: FileSystemReadWriteOptions) {
    if (plain(view)) return read.call(this, view, opts);
    const target = bytes(view);
    const copy = new Uint8Array(target.byteLength);
    const n = read.call(this, copy, opts);
    target.set(copy);
    return n;
  };
  proto.write = function (this: FileSystemSyncAccessHandle, view: ArrayBufferView, opts?: FileSystemReadWriteOptions) {
    if (plain(view)) return write.call(this, view, opts);
    return write.call(this, bytes(view).slice(), opts);
  };
}
patchAccessHandle();

let fs: OpfsAhpFS | undefined;

/**
 * Close the database's files now, before the app reloads its page or erases
 * the database (see releaseDb in ./db.ts). WebKit (iOS) keeps the sync access handles of a
 * worker that's terminated with them open locked until the app restarts, so
 * the next page's worker could never open the database; it waited until the
 * open timed out. Closing them is all that's needed: Postgres isn't shut down
 * first, and on the next open it recovers from its write-ahead log, as it
 * does when the app is killed. Messages are handled between tasks, so no
 * query is cut off mid-write.
 */
addEventListener("message", (event: MessageEvent) => {
  if (event.data?.type !== RELEASE_DB) return;
  const open = fs;
  fs = undefined;
  void Promise.resolve(open?.closeFs())
    .catch(() => undefined)
    .finally(() => postMessage({ type: DB_RELEASED }));
});

worker({
  async init() {
    fs = new OpfsAhpFS(DATA_DIR);
    const pg = new PGlite({ fs });
    await pg.waitReady;
    return pg;
  },
});
