import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Prisma client singleton. In dev, Next.js hot-reload would otherwise create a
 * new client on every reload and exhaust connections.
 *
 * Queries go through the `pg` driver adapter rather than Prisma's built-in
 * engine: over Supabase's transaction pooler (`?pgbouncer=true`) the engine
 * needs several network round trips per query (measured ~300ms per query
 * against ap-southeast-1), while `pg` needs one (~60ms). The pooled URL stays the
 * same; `pgbouncer=true` is a Prisma-engine flag that `pg` would forward to
 * the server as an unknown setting, so it's dropped here.
 */
function pooledUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return raw;
  const url = new URL(raw);
  url.searchParams.delete("pgbouncer");
  return url.toString();
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: pooledUrl() }),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
