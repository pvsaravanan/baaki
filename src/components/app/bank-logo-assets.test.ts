import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { BANKS } from "@/lib/banks";
import { BANK_LOGOS } from "./bank-logo-assets";

const directory = new URL("../../assets/banks/", import.meta.url);
const filenames = readdirSync(directory).filter((file) => file.endsWith(".svg")).sort();
const sources = Object.values(BANK_LOGOS).map((logo) => typeof logo === "string" ? logo : logo!.src);

describe("local bank logos", () => {
  it("maps every supplied SVG without using external image services", () => {
    expect(sources.every((src) => src.startsWith("/") && !src.startsWith("//"))).toBe(true);
    expect(sources.map((src) => decodeURIComponent(src.split("/").pop()!)).sort()).toEqual(filenames);
  });

  it("maps a local logo for every registered bank", () => {
    expect(Object.keys(BANK_LOGOS).sort()).toEqual(BANKS.map((bank) => bank.id).sort());
    expect(BANKS.every((bank) => Boolean(BANK_LOGOS[bank.id]))).toBe(true);
  });

  it.each([
    ["dbs", "DBS Bank.svg"],
    ["indusind", "IndusInd Bank.svg"],
  ])("maps %s to %s", (id, filename) => {
    const logo = BANK_LOGOS[id]!;
    const src = typeof logo === "string" ? logo : logo.src;
    expect(decodeURIComponent(src)).toContain(filename);
  });

  it.each(filenames)("keeps %s scalable at icon sizes", (filename) => {
    const content = readFileSync(fileURLToPath(new URL(encodeURIComponent(filename), directory)), "utf8");
    const root = content.match(/<svg\s[^>]*>/)?.[0];
    expect(root).toMatch(/viewBox="[^"]+"/);
    expect(content).not.toMatch(/<script\b|<foreignObject\b/i);
  });
});
