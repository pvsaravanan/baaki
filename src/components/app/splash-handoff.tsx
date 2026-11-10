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

const LaunchVideo = registerPlugin<{ finish(): Promise<void> }>("LaunchVideo");

let resolveGone: () => void;
/** Settles once the splash has left the screen (straight away if there's none). */
export const splashGone = new Promise<void>((resolve) => (resolveGone = resolve));
export const markSplashGone = () => resolveGone();

/** `hideNative` is the fallback for an install without the launch animation. */
export function SplashHandoff({ hideNative, ready }: { hideNative: () => Promise<unknown>; ready: boolean }) {
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    // Not until the screen beneath has painted (two frames on) and the page
    // has settled: dissolving into a screen that's still drawing stutters.
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        const finish = () => {
          if (cancelled) return;
          LaunchVideo.finish()
            .catch(() => hideNative())
            .catch(() => {})
            .finally(markSplashGone);
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
