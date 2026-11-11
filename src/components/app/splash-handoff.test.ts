import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { SPLASH_BACKGROUND } from "./splash-handoff";

const res = join(__dirname, "../../../android/app/src/main/res");

// The launch animation's cover and the system splash before it share one colour.
it("matches the native splash's colour", () => {
  const colour = /<color name="splash_background">(#[0-9A-Fa-f]{6})<\/color>/.exec(
    readFileSync(join(res, "values/splash_background.xml"), "utf8"),
  )?.[1];
  expect(colour?.toLowerCase()).toBe(SPLASH_BACKGROUND);
});

it("ships the launch video", () => {
  expect(existsSync(join(res, "raw/splash.mp4"))).toBe(true);
});

// The system splash shows the logo that the app's launch cover then takes over.
it("shows the launch logo on the system splash", () => {
  const styles = readFileSync(join(res, "values/styles.xml"), "utf8");
  const launch = /<style name="AppTheme\.NoActionBarLaunch"[\s\S]*?<\/style>/.exec(styles)?.[0] ?? "";
  expect(launch).toMatch(/windowSplashScreenAnimatedIcon">@drawable\/launch_logo</);
  expect(existsSync(join(res, "drawable-nodpi/launch_logo.png"))).toBe(true);
});
