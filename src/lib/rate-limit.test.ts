import { beforeEach, describe, expect, it, vi } from "vitest";

// Fakes the RateLimitBucket table with an in-memory Map, replicating the
// atomic upsert's semantics (fresh window vs increment-in-place) so these
// tests exercise the real calling code's logic, not just the mock.
const table = vi.hoisted(() => new Map<string, { count: number; resetAt: Date }>());

const db = vi.hoisted(() => ({
  rateLimitBucket: {
    deleteMany: vi.fn(async ({ where }: { where: { key?: string; resetAt?: { lte: Date } } }) => {
      let count = 0;
      for (const [k, v] of table) {
        if (where.key !== undefined ? k === where.key : v.resetAt.getTime() <= where.resetAt!.lte.getTime()) {
          table.delete(k);
          count += 1;
        }
      }
      return { count };
    }),
  },
  // The real query interpolates `now` and `freshResetAt` more than once
  // (each `${...}` is its own bound parameter), so pick them out by value
  // rather than by position: `now` is always the earlier of the two.
  $queryRaw: vi.fn(async (_strings: TemplateStringsArray, ...values: unknown[]) => {
    const key = values.find((v): v is string => typeof v === "string")!;
    const dates = values.filter((v): v is Date => v instanceof Date);
    const now = dates.reduce((a, b) => (a.getTime() < b.getTime() ? a : b));
    const freshResetAt = dates.reduce((a, b) => (a.getTime() > b.getTime() ? a : b));

    const existing = table.get(key);
    if (!existing || existing.resetAt.getTime() <= now.getTime()) {
      table.set(key, { count: 1, resetAt: freshResetAt });
    } else {
      existing.count += 1;
    }
    const row = table.get(key)!;
    return [{ count: row.count, resetAt: row.resetAt }];
  }),
}));
vi.mock("./db", () => ({ prisma: db }));

import { clientKey, rateLimit, resetRateLimit } from "./rate-limit";

beforeEach(() => {
  table.clear();
  vi.clearAllMocks();
});

describe("rateLimit", () => {
  it("allows up to the limit then blocks", async () => {
    const key = `t1-${Math.random()}`;
    for (let i = 0; i < 5; i++) expect((await rateLimit(key, 5, 60_000)).ok).toBe(true);
    const blocked = await rateLimit(key, 5, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it("reports remaining attempts", async () => {
    const key = `t2-${Math.random()}`;
    expect((await rateLimit(key, 3, 60_000)).remaining).toBe(2);
    expect((await rateLimit(key, 3, 60_000)).remaining).toBe(1);
    expect((await rateLimit(key, 3, 60_000)).remaining).toBe(0);
  });

  it("keeps separate counters per key", async () => {
    const a = `t3a-${Math.random()}`;
    const b = `t3b-${Math.random()}`;
    await rateLimit(a, 1, 60_000);
    expect((await rateLimit(a, 1, 60_000)).ok).toBe(false);
    expect((await rateLimit(b, 1, 60_000)).ok).toBe(true);
  });

  it("resets a key on demand (successful login)", async () => {
    const key = `t4-${Math.random()}`;
    await rateLimit(key, 1, 60_000);
    expect((await rateLimit(key, 1, 60_000)).ok).toBe(false);
    await resetRateLimit(key);
    expect((await rateLimit(key, 1, 60_000)).ok).toBe(true);
  });

  it("starts a fresh window once the old one expires", async () => {
    const key = `t5-${Math.random()}`;
    expect((await rateLimit(key, 1, 1)).ok).toBe(true);
    expect((await rateLimit(key, 1, 1)).ok).toBe(false);
    const start = Date.now();
    while (Date.now() - start < 5) { /* let the 1ms window lapse */ }
    expect((await rateLimit(key, 1, 1)).ok).toBe(true);
  });
});

describe("clientKey", () => {
  it("derives a scoped key from the trusted (rightmost) forwarding hop", () => {
    // The client can forge leftmost x-forwarded-for entries; only the hop our
    // own proxy appended (rightmost, with the default single trusted proxy) is
    // trustworthy, so a spoofed prefix must be ignored.
    const req = new Request("http://x/", { headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" } });
    expect(clientKey(req, "login")).toBe("login:5.6.7.8");
  });

  it("prefers x-real-ip over x-forwarded-for", () => {
    const req = new Request("http://x/", {
      headers: { "x-real-ip": "9.9.9.9", "x-forwarded-for": "1.2.3.4" },
    });
    expect(clientKey(req, "login")).toBe("login:9.9.9.9");
  });

  it("falls back when no ip header is present", () => {
    expect(clientKey(new Request("http://x/"), "login")).toBe("login:local");
  });
});
