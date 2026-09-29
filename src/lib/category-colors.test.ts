import { describe, expect, it } from "vitest";
import { CATEGORY_COLORS, categoryColorName, leastUsedColor } from "./category-colors";

describe("category colours", () => {
  it("offers 30 distinct, named colours", () => {
    expect(CATEGORY_COLORS).toHaveLength(30);
    expect(new Set(CATEGORY_COLORS.map((c) => c.hex)).size).toBe(30);
    expect(CATEGORY_COLORS.every((c) => !c.name.startsWith("#"))).toBe(true);
  });

  it("suggests an extra tone before repeating one the built-in categories use", () => {
    const builtIns = CATEGORY_COLORS.slice(0, 19).map((c) => c.hex);
    expect(leastUsedColor(builtIns)).toBe("#c47a7a"); // Dusty rose
  });

  it("picks a colour nobody uses yet", () => {
    const used = CATEGORY_COLORS.slice(0, 5).map((c) => c.hex);
    expect(used).not.toContain(leastUsedColor(used));
    expect(leastUsedColor(used)).toBe(CATEGORY_COLORS[5].hex);
  });

  it("once all are taken, picks one used least often", () => {
    const all = CATEGORY_COLORS.map((c) => c.hex);
    const used = [...all, ...all.filter((h) => h !== CATEGORY_COLORS[7].hex)];
    expect(leastUsedColor(used)).toBe(CATEGORY_COLORS[7].hex);
  });

  it("ignores colours outside the palette and letter case", () => {
    expect(leastUsedColor(["#6366F1", CATEGORY_COLORS[0].hex.toUpperCase()])).toBe(CATEGORY_COLORS[1].hex);
    expect(categoryColorName("#D88060")).toBe("Clay coral");
    expect(categoryColorName("#6366f1")).toBe("Custom");
  });
});
