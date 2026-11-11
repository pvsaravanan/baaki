"use client";
import { useEffect } from "react";
import { registerPlugin } from "@capacitor/core";

/**
 * The launch animation is played by Android itself the moment the app opens
 * (android/.../LaunchVideo.java, the video rendered from baaki-splash/), over
 * the app while it loads. This tells it once the screen beneath is `ready`;
 * it then finishes playing (if it hasn't), fades away, and `splashGone`
 * settles.
 */
/** The splash background, as Android draws it (SPLASH_BACKGROUND in
 * scripts/make-app-icons.mjs; splash-handoff.test.ts checks they agree). It is
 * also the launch video's background. */
export const SPLASH_BACKGROUND = "#f8f2e9";

/** Where the app's own copy of the logo is, in CSS pixels: the launch logo glides there. */
interface LogoTarget {
  x: number;
  y: number;
  width: number;
  height: number;
}

const LaunchVideo = registerPlugin<{ finish(target?: LogoTarget): Promise<void> }>("LaunchVideo");

let resolveGone: () => void;
/** Settles once the splash has left the screen (straight away if there's none). */
export const splashGone = new Promise<void>((resolve) => (resolveGone = resolve));
export const markSplashGone = () => resolveGone();

/** `hideNative` is the fallback for an install without the launch animation. */
export function SplashHandoff({ hideNative, ready }: { hideNative: () => Promise<unknown>; ready: boolean }) {
  // The app's own logo (data-launch-logo) stays hidden until the launch logo has
  // glided onto it. If that never happens, don't leave it hidden for good.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.launching = "1";
    const failsafe = setTimeout(() => delete root.dataset.launching, 15000);
    return () => {
      clearTimeout(failsafe);
      delete root.dataset.launching;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    // Not until the screen beneath has painted (two frames on) and the page
    // has settled: dissolving into a screen that's still drawing stutters.
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        const finish = () => {
          if (cancelled) return;
          // A screen with a logo of its own (the welcome screen) gets the launch
          // logo carried onto it; any other screen is just dissolved into.
          const r = document.querySelector<HTMLElement>("[data-launch-logo]")?.getBoundingClientRect();
          LaunchVideo.finish(r && r.width > 0 ? { x: r.left, y: r.top, width: r.width, height: r.height } : undefined)
            .catch(() => hideNative())
            .catch(() => {})
            .finally(() => {
              delete document.documentElement.dataset.launching;
              markSplashGone();
            });
        };
        if ("requestIdleCallback" in window) requestIdleCallback(finish, { timeout: 600 });
        else finish();
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [ready, hideNative]);
  return null;
}
