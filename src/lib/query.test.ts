import { describe, expect, it } from "vitest";
import { buildWhere } from "./query";

describe("buildWhere", () => {
  it("matches transfers on either account when filtering by account", () => {
    const where = buildWhere("u1", new URLSearchParams({ accountId: "a1,a2" }));
    expect(where.accountId).toBeUndefined();
    expect(where.AND).toContainEqual({
      OR: [{ accountId: { in: ["a1", "a2"] } }, { transferAccountId: { in: ["a1", "a2"] } }],
    });
  });

  it("keeps only transactions with notes, not blank ones", () => {
    const where = buildWhere("u1", new URLSearchParams({ hasNotes: "1" }));
    expect(where.AND).toEqual([{ notes: { not: null } }, { NOT: { notes: "" } }]);
  });

  it("keeps only transactions a recurring rule made", () => {
    const where = buildWhere("u1", new URLSearchParams({ recurring: "1" }));
    expect(where.recurringId).toEqual({ not: null });
  });

  it("adds no account condition when none is chosen", () => {
    const where = buildWhere("u1", new URLSearchParams());
    expect(where.AND).toBeUndefined();
  });
});
