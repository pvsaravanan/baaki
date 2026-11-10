"use client";
import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { SplashHandoff, markSplashGone } from "./splash-handoff";

const hideNativeSplash = () => import("@capacitor/splash-screen").then(({ SplashScreen }) => SplashScreen.hide());

// The splash leaves once per launch, through the first NativeApp to mount (the
// welcome screen's, or the app's); later ones (onboarding into the app) skip it.
let splashHandedOff = false;

/**
 * Android integration, once the app has started: see the splash screen out
 * smoothly (SplashHandoff), and make the system Back button behave like a
 * native app — close whatever is open on top (a form, sheet, picker or menu),
 * otherwise go back a screen, otherwise leave the app.
 */
export function NativeApp({ ready = true }: { ready?: boolean }) {
  const [handoff] = useState(() => {
    const first = Capacitor.isNativePlatform() && !splashHandedOff;
    if (first) splashHandedOff = true;
    return first;
  });

  useEffect(() => {
    if (!handoff) markSplashGone();
    if (!Capacitor.isNativePlatform()) return;
    if (!handoff) void hideNativeSplash();

    let cleanup: (() => void) | undefined;
    let cancelled = false;
    import("@capacitor/app").then(async ({ App }) => {
      const handle = await App.addListener("backButton", ({ canGoBack }) => {
        // Every overlay closes on Escape (modal, sheet, pickers, menus).
        if (document.querySelector('[role="dialog"], [role="listbox"], [role="menu"]')) {
          document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
          return;
        }
        const home = window.location.pathname.replace(/\/$/, "") === "/dashboard";
        if (canGoBack && !home) window.history.back();
        else void App.minimizeApp();
      });
      cleanup = () => void handle.remove();
      if (cancelled) cleanup();
    });
    return () => {
      cancelled = true;
      cleanup?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return handoff ? <SplashHandoff hideNative={hideNativeSplash} ready={ready} /> : null;
}
