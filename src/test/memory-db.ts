import { PGlite } from "@electric-sql/pglite";
import { PrismaPGlite } from "pglite-prisma-adapter";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * A throwaway in-memory copy of the on-device database, for tests that run
 * the real services and routes. Use as the `@/lib/db` module:
 *
 *   vi.mock("@/lib/db", async () => (await import("@/test/memory-db")).memoryDb());
 */
export function memoryDb() {
  const pglite = new PGlite();
  const prisma = new PrismaClient({ adapter: new PrismaPGlite(pglite) as never });
  const dbFailed = new Promise<never>(() => undefined); // an in-memory database doesn't fail to start
  return { pglite, prisma, dbFailed };
}
