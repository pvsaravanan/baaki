import { describe, expect, it } from "vitest";
import { decodeWire, encodeWire } from "./wire";

describe("wire format", () => {
  it("brings Dates back as Dates, wherever they sit", () => {
    const sent = { a: new Date("2026-11-05T10:00:00.000Z"), list: [{ when: new Date(0) }], n: 3, s: "x", none: null };
    const got = decodeWire<typeof sent>(encodeWire(sent));
    expect(got.a).toBeInstanceOf(Date);
    expect(got.a.toISOString()).toBe("2026-11-05T10:00:00.000Z");
    expect(got.list[0].when).toBeInstanceOf(Date);
    expect(got).toMatchObject({ n: 3, s: "x", none: null });
  });

  it("leaves strings that look like dates alone", () => {
    expect(decodeWire<{ d: string }>(encodeWire({ d: "2026-11-05" })).d).toBe("2026-11-05");
  });
});
