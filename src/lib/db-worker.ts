/// <reference lib="webworker" />
import { PGlite } from "@electric-sql/pglite";
import { OpfsAhpFS } from "@electric-sql/pglite/opfs-ahp";
import { worker } from "@electric-sql/pglite/worker";
import { DATA_DIR } from "./db-storage";

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

worker({
  async init() {
    const pg = new PGlite({ fs: new OpfsAhpFS(DATA_DIR) });
    await pg.waitReady;
    return pg;
  },
});
