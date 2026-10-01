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
worker({
  async init() {
    const pg = new PGlite({ fs: new OpfsAhpFS(DATA_DIR) });
    await pg.waitReady;
    return pg;
  },
});
