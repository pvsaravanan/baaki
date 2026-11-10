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

// The system splash animates the logo in, for as long as the animation runs.
it("animates the logo on the system splash", () => {
  const styles = readFileSync(join(res, "values/styles.xml"), "utf8");
  const launch = /<style name="AppTheme\.NoActionBarLaunch"[\s\S]*?<\/style>/.exec(styles)?.[0] ?? "";
  expect(launch).toMatch(/windowSplashScreenAnimatedIcon">@drawable\/launch_logo_animated</);
  const duration = Number(/windowSplashScreenAnimationDuration">(\d+)</.exec(launch)?.[1]);
  const animated = readFileSync(join(res, "drawable/launch_logo_animated.xml"), "utf8");
  const longest = Math.max(...[...animated.matchAll(/android:duration="(\d+)"/g)].map((m) => Number(m[1])));
  expect(longest).toBe(duration);
});
