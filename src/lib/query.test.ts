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

  it("adds no account condition when none is chosen", () => {
    const where = buildWhere("u1", new URLSearchParams());
    expect(where.AND).toBeUndefined();
  });
});
