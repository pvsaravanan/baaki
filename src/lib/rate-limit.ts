import "server-only";
import { prisma } from "./db";

/**
 * Generic fixed-window rate limiter for our own API routes.
 *
 * Currently wired into POST /api/recurring/run-due (a per-user cap on
 * manually triggering the auto-post job). Login, register and
 * forgot-password are NOT rate-limited here — those go straight from the
 * client to Supabase Auth, which enforces its own brute-force/credential-
 * stuffing rate limits server-side; there is no local route for those flows
 * to attach this limiter to. If a custom server-side auth route is added
 * later, this is the place to rate-limit it.
 *
 * State lives in the RateLimitBucket table (Postgres, shared by every
 * instance) rather than in-process memory: a serverless deployment runs many
 * short-lived instances behind the same routes, each with its own memory, so
 * an in-memory counter only ever sees the fraction of traffic that landed on
 * that particular instance and silently under-enforces the limit. The
 * increment itself is a single atomic `INSERT ... ON CONFLICT` upsert so two
 * concurrent requests (different instances or not) can't both read the same
 * count and both write back the same increment, losing a hit.
 */

let lastSweep = 0;

/** Drop expired windows occasionally so the table cannot grow without bound. */
async function sweep(now: Date) {
  if (now.getTime() - lastSweep < 60_000) return;
  lastSweep = now.getTime();
  await prisma.rateLimitBucket.deleteMany({ where: { resetAt: { lte: now } } });
}

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the window resets (for Retry-After). */
  retryAfter: number;
  remaining: number;
}

/**
 * Consume one unit against `key`. Returns ok:false once `limit` is exceeded
 * within `windowMs`.
 */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const now = new Date();
  await sweep(now);

  const freshResetAt = new Date(now.getTime() + windowMs);
  // One round trip, race-free: start a fresh window (count 1) if none exists
  // or the existing one has expired, otherwise increment in place — decided
  // and applied atomically by Postgres, not read-then-written by us.
  const rows = await prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
    INSERT INTO "RateLimitBucket" ("key", "count", "resetAt")
    VALUES (${key}, 1, ${freshResetAt})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimitBucket"."resetAt" <= ${now} THEN 1 ELSE "RateLimitBucket"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimitBucket"."resetAt" <= ${now} THEN ${freshResetAt} ELSE "RateLimitBucket"."resetAt" END
    RETURNING "count", "resetAt"
  `;
  const { count, resetAt } = rows[0];

  if (count > limit) {
    return {
      ok: false,
      retryAfter: Math.max(1, Math.ceil((resetAt.getTime() - now.getTime()) / 1000)),
      remaining: 0,
    };
  }
  return { ok: true, retryAfter: 0, remaining: limit - count };
}

/** Clear a key's window — call after a successful login so honest users reset. */
export async function resetRateLimit(key: string): Promise<void> {
  await prisma.rateLimitBucket.deleteMany({ where: { key } });
}

/**
 * Extract the client IP from forwarding headers, resistant to header spoofing.
 *
 * `x-forwarded-for` is a comma-separated list where each proxy APPENDS the
 * address it saw, so a client-supplied prefix is attacker-controlled: taking
 * the FIRST (leftmost) value lets anyone forge a fresh IP per request and get
 * a new rate-limit bucket every time. We instead count hops from the RIGHT —
 * the rightmost entries are the ones our own infrastructure appended and the
 * client cannot forge past our trusted hop(s).
 *
 * `TRUSTED_PROXY_COUNT` = the number of trusted proxies in front of the app
 * (default 1). We use the entry inserted by the outermost trusted proxy, i.e.
 * `list[list.length - TRUSTED_PROXY_COUNT]`. Any values the client injected
 * sit further left and are ignored. `x-real-ip` (set and overwritten by the
 * proxy, not appended) is preferred when present.
 *
 * A direct-to-internet deployment with no proxy has no trustworthy header —
 * that case surfaces via `isUnknownClient` so callers can decline IP-wide
 * enforcement instead of keying off a forgeable value.
 */
function trustedProxyCount(): number {
  const n = Number(process.env.TRUSTED_PROXY_COUNT);
  return Number.isFinite(n) && n >= 1 ? Math.trunc(n) : 1;
}

function clientIp(req: Request): string | null {
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const fwd = req.headers.get("x-forwarded-for");
  if (!fwd) return null;
  const list = fwd.split(",").map((s) => s.trim()).filter(Boolean);
  if (list.length === 0) return null;
  const idx = Math.max(0, list.length - trustedProxyCount());
  return list[idx] ?? null;
}

/**
 * Best-effort client identifier. Behind a correctly-configured proxy this
 * trusts the hop appended by that proxy (see `clientIp`); a direct-to-internet
 * deployment has no trustworthy IP and falls back to a single shared bucket.
 */
export function clientKey(req: Request, scope: string): string {
  return `${scope}:${clientIp(req) ?? "local"}`;
}

/** True when no real per-client IP could be determined (see clientKey). */
export function isUnknownClient(req: Request): boolean {
  return clientIp(req) === null;
}
