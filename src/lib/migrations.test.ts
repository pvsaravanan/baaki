import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", async () => (await import("@/test/memory-db")).memoryDb());

import { MIGRATIONS } from "@/generated/migrations";
import { pglite } from "./db";
import { ensureDb } from "./local-db";

/**
 * Phones only ever get the schema by running prisma/migrations in order, so
 * those migrations must add up to exactly what prisma/schema.prisma says.
 * Build the database both ways and compare tables, columns, indexes and
 * constraints.
 */

type Db = Pick<PGlite, "query">;

async function describeSchema(db: Db) {
  const rows = async (sql: string) =>
    (await db.query<Record<string, unknown>>(sql)).rows.map((r) => JSON.stringify(r)).sort();
  return {
    columns: await rows(`
      SELECT table_name, column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name <> '_baaki_migrations'`),
    indexes: await rows(`
      SELECT indexname, indexdef FROM pg_indexes
      WHERE schemaname = 'public' AND tablename <> '_baaki_migrations'`),
    constraints: await rows(`
      SELECT c.conrelid::regclass::text AS "table", c.conname, pg_get_constraintdef(c.oid) AS def
      FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE n.nspname = 'public' AND c.conrelid::regclass::text <> '_baaki_migrations'`),
  };
}

function schemaFromPrisma(): string {
  const root = join(__dirname, "../..");
  return execFileSync(
    join(root, "node_modules/.bin/prisma"),
    ["migrate", "diff", "--from-empty", "--to-schema-datamodel", "prisma/schema.prisma", "--script"],
    { cwd: root, encoding: "utf8" },
  );
}

describe("database migrations", () => {
  it("apply in order to a new phone, once each", async () => {
    await ensureDb();
    const { rows } = await pglite.query<{ name: string }>(`SELECT "name" FROM "_baaki_migrations" ORDER BY "name"`);
    expect(rows.map((r) => r.name)).toEqual(MIGRATIONS.map((m) => m.name));
  });

  it("build the same database as prisma/schema.prisma", async () => {
    await ensureDb();
    const expected = new PGlite();
    await expected.exec(schemaFromPrisma());
    expect(await describeSchema(pglite as unknown as Db)).toEqual(await describeSchema(expected));
  }, 30_000);
});
