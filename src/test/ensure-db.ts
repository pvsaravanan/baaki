import type { PGlite } from "@electric-sql/pglite";
import { MIGRATIONS } from "@/generated/migrations";

/**
 * Test support: bring the in-memory database (see ./memory-db) up to date by
 * applying, in order, every prisma/migrations/*.sql, the same SQL
 * `prisma migrate deploy` runs against the real database. Later calls share
 * one promise.
 */
let ready: Promise<void> | null = null;

export function ensureDb(): Promise<void> {
  ready ??= migrate().catch((err) => {
    ready = null; // let the next call try again
    throw err;
  });
  return ready;
}

async function migrate(): Promise<void> {
  // `@/lib/db/db` is mocked with memoryDb() in the tests that call this.
  const { pglite } = (await import("@/lib/db/db")) as unknown as { pglite: PGlite };
  await pglite.waitReady;
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
