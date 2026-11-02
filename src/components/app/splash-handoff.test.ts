import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { SPLASH_BACKGROUND, SPLASH_ICON_DP, SPLASH_LOGO_SIZE } from "./splash-handoff";

const res = join(__dirname, "../../../android/app/src/main/res");

// The in-app copy must match Android's splash exactly, or the hand-over shows a jump.
it("matches the native splash's colour and logo size", () => {
  const colour = /<color name="splash_background">(#[0-9A-Fa-f]{6})<\/color>/.exec(
    readFileSync(join(res, "values/splash_background.xml"), "utf8"),
  )?.[1];
  expect(colour?.toLowerCase()).toBe(SPLASH_BACKGROUND);

  // Android draws the splash icon at a fixed size; the tile is its share of the viewport.
  const drawable = readFileSync(join(res, "drawable/baaki_splash.xml"), "utf8");
  const viewport = Number(/android:viewportWidth="(\d+)"/.exec(drawable)?.[1]);
  expect((SPLASH_ICON_DP * 1254) / viewport).toBeCloseTo(SPLASH_LOGO_SIZE, 5);
});
