"use client";
import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

/**
 * Android integration, once the app has started: hide the splash screen, and
 * make the system Back button behave like a native app — close whatever is
 * open on top (a form, sheet, picker or menu), otherwise go back a screen,
 * otherwise leave the app.
 */
export function NativeApp() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    import("@capacitor/splash-screen").then(({ SplashScreen }) => SplashScreen.hide());

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
  }, []);

  return null;
}
