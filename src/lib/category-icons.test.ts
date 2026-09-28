import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CATEGORY_ICON_KEYS, DEFAULT_CATEGORY_ICON, isCategoryIcon, resolveCategoryIcon } from "./category-icons";
import { CATEGORY_ICON_IMAGES } from "@/components/app/category-icon-assets";
import { DEFAULT_CATEGORIES } from "./constants";
import { categorySchema } from "./validation";

const files = readdirSync(new URL("../assets/icons/", import.meta.url))
  .filter((f) => f.endsWith(".png"))
  .map((f) => f.slice(0, -".png".length))
  .sort();

describe("category icons", () => {
  it("has exactly one key per supplied icon file, and an image for each", () => {
    expect([...CATEGORY_ICON_KEYS].sort()).toEqual(files);
    expect(new Set(CATEGORY_ICON_KEYS).size).toBe(CATEGORY_ICON_KEYS.length);
    expect(Object.keys(CATEGORY_ICON_IMAGES).sort()).toEqual(files);
  });

  it("maps every line-icon name categories were saved with onto a real icon", () => {
    const legacy = [
      "home", "utensils", "shopping-basket", "car", "graduation-cap", "heart-pulse", "heart",
      "clapperboard", "shopping-bag", "repeat", "receipt", "plane", "user", "users", "landmark",
      "wallet", "briefcase", "trending-up", "plus-circle", "circle-dot", "tag", "target",
      "smartphone", "wifi", "banknote",
    ];
    for (const name of legacy) expect(isCategoryIcon(resolveCategoryIcon(name))).toBe(true);
    expect(resolveCategoryIcon("home")).toBe("house");
    expect(resolveCategoryIcon("groceries")).toBe("groceries");
    expect(resolveCategoryIcon("not-an-icon")).toBe(DEFAULT_CATEGORY_ICON);
    expect(resolveCategoryIcon(null)).toBe(DEFAULT_CATEGORY_ICON);
  });

  it("seeds new users' default categories with current icons", () => {
    expect(DEFAULT_CATEGORIES.every((c) => isCategoryIcon(c.icon))).toBe(true);
  });

  it("only accepts icons from the set when saving a category", () => {
    expect(categorySchema.parse({ name: "Pets", icon: "paws" }).icon).toBe("paws");
    expect(categorySchema.parse({ name: "Misc" }).icon).toBe(DEFAULT_CATEGORY_ICON);
    expect(categorySchema.safeParse({ name: "Food", icon: "utensils" }).success).toBe(false);
  });
});
