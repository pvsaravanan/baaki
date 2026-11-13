import { PGliteWorker } from "@electric-sql/pglite/worker";
import { PrismaPGlite } from "pglite-prisma-adapter";
import { PrismaClient } from "@/generated/prisma/client";
import { DB_RELEASED, RELEASE_DB } from "./db-storage";

/**
 * The app's database lives on the device: PGlite is Postgres compiled to
 * WebAssembly. It runs in a worker (./db-worker.ts) and stores its files in
 * the app's private file system — kept across restarts and updates, removed
 * only with the app. Prisma talks to it through a driver adapter, so the
 * services keep using the same Prisma API they did against the hosted
 * database.
 *
 * Only ever loaded in the browser, through the local API (see
 * src/server/local-server.ts). Call `ensureDb()` (src/lib/local-db.ts) before
 * the first query so the schema is up to date.
 */
const dbWorker = new Worker(new URL("./db-worker.ts", import.meta.url), { type: "module" });

export const pglite = new PGliteWorker(dbWorker);

/**
 * Have the worker close the database's files, resolving once it has (or
 * after `waitMs`, if it doesn't answer). Needed before the worker goes:
 * WebKit (iOS) keeps the files of a terminated worker locked until the app
 * restarts, which left the next page unable to open the database. The app's
 * own reloads go through reloadApp (src/lib/local-api.ts), which calls this.
 * (Doing it on pagehide doesn't work: by then WebKit has stopped the worker.)
 */
export function releaseDb(waitMs = 1000): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      dbWorker.removeEventListener("message", onMessage);
      resolve();
    };
    const onMessage = (e: MessageEvent) => e.data?.type === DB_RELEASED && done();
    const timer = setTimeout(done, waitMs);
    dbWorker.addEventListener("message", onMessage);
    dbWorker.postMessage({ type: RELEASE_DB });
  });
}

/**
 * Rejects if the worker itself fails (e.g. the engine can't load). PGlite's
 * own ready promise would otherwise just never settle.
 */
export const dbFailed = new Promise<never>((_, reject) => {
  dbWorker.addEventListener("error", (e) => reject(new Error(e.message || "The database could not start.")));
});
dbFailed.catch(() => undefined); // only awaited while opening

// The adapter is built against an older @prisma/driver-adapter-utils than
// this Prisma version bundles; the interface it implements is unchanged at
// runtime, only the type identities differ.
type Adapter = NonNullable<ConstructorParameters<typeof PrismaClient>[0]>["adapter"];

export const prisma = new PrismaClient({ adapter: new PrismaPGlite(pglite as never) as unknown as Adapter });
