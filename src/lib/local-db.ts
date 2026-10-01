import { MIGRATIONS } from "@/generated/migrations";
import { dbFailed, pglite } from "./db";

/**
 * Bring the on-device database up to date: apply, in order, every
 * prisma/migrations/*.sql that hasn't run yet, each in its own transaction
 * and recorded in "_baaki_migrations". Runs once per app start; later calls
 * share the same promise.
 */
let ready: Promise<void> | null = null;

export function ensureDb(): Promise<void> {
  ready ??= migrate().catch((err) => {
    ready = null; // let the next call try again
    throw err;
  });
  return ready;
}

/**
 * First launch sets up the database files (a few seconds on a slow phone);
 * past this, something is wrong — say so (the app then offers recovery)
 * rather than wait forever.
 */
const OPEN_TIMEOUT_MS = 45_000;

async function migrate(): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      pglite.waitReady,
      dbFailed,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("The database took too long to open.")), OPEN_TIMEOUT_MS);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
  await pglite.exec(
    `CREATE TABLE IF NOT EXISTS "_baaki_migrations" ("name" TEXT PRIMARY KEY, "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  );
  const { rows } = await pglite.query<{ name: string }>(`SELECT "name" FROM "_baaki_migrations"`);
  const applied = new Set(rows.map((r) => r.name));
  for (const { name, sql } of MIGRATIONS) {
    if (applied.has(name)) continue;
    await pglite.transaction(async (tx) => {
      await tx.exec(sql);
      await tx.query(`INSERT INTO "_baaki_migrations" ("name") VALUES ($1)`, [name]);
    });
  }
}
