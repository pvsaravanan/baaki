"use client";
import { useEffect, useState } from "react";
import logo from "@/assets/baaki_logo_with_background.svg";

/**
 * Android's splash, carried into the app so it leaves smoothly. This draws an
 * exact copy (same colour, the logo at the same size and place), and only once
 * it's on screen is the native splash taken away, so the hand-over itself
 * changes nothing. Then, one after the other so they never overlap: the logo
 * fades away, and the background dissolves into the screen beneath.
 *
 * Both values follow scripts/make-app-icons.mjs, which draws the native splash
 * (splash-handoff.test.ts checks they still agree):
 */
/** The splash background (SPLASH_BACKGROUND there). */
export const SPLASH_BACKGROUND = "#f8f2e9";
/** The width Android draws a splash icon at, in dp, when it has no icon
 * background: 288dp, whatever size the drawable itself declares. */
export const SPLASH_ICON_DP = 288;
/** The logo tile's width on the splash, in dp (= CSS px in the WebView): the
 * 1254-wide tile in the drawable's 2420-wide viewport, drawn at 288dp. */
export const SPLASH_LOGO_SIZE = (SPLASH_ICON_DP * 1254) / 2420;

// Android takes the native splash away a frame or two after being asked to; the
// copy waits that long before it starts to change, so nothing moves behind it.
const NATIVE_GONE_MS = 120;
const LOGO_OUT_MS = 220;
// A beat of plain background between the two, so they never overlap.
const PAUSE_MS = 60;
const BACKGROUND_OUT_MS = 320;

type Phase = "showing" | "logo-out" | "background-out" | "gone";

let resolveGone: () => void;
/** Settles once the splash has left the screen (straight away if there's none). */
export const splashGone = new Promise<void>((resolve) => (resolveGone = resolve));
export const markSplashGone = () => resolveGone();

/** `onShown` takes the native splash away; the copy starts leaving once it has. */
export function SplashHandoff({ onShown }: { onShown: () => Promise<unknown> }) {
  const [phase, setPhase] = useState<Phase>("showing");

  useEffect(() => {
    // Once the copy has been painted (two frames on), the native splash can go.
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        const leave = () => {
          if (cancelled) return;
          const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          timer = setTimeout(() => setPhase(still ? "gone" : "logo-out"), NATIVE_GONE_MS);
        };
        // Even if hiding fails, the copy must not stay up.
        onShown().then(leave, leave);
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [onShown]);

  // The background goes once the logo's fade has really finished (its
  // transitionend), not after a timer, which can run ahead of the animation and
  // leave the logo faintly over the screen beneath. A fallback timer in case
  // the event never comes.
  // The dissolve also waits for the app to be idle: started while the screen
  // beneath is still settling, it stalls and the screen pops in instead.
  const logoGone = () =>
    setTimeout(() => {
      const go = () => setPhase((p) => (p === "logo-out" ? "background-out" : p));
      if ("requestIdleCallback" in window) requestIdleCallback(go, { timeout: 400 });
      else go();
    }, PAUSE_MS);
  useEffect(() => {
    if (phase === "logo-out") {
      const t = setTimeout(() => setPhase((p) => (p === "logo-out" ? "background-out" : p)), LOGO_OUT_MS + 300);
      return () => clearTimeout(t);
    }
    if (phase === "background-out") {
      const t = setTimeout(() => setPhase("gone"), BACKGROUND_OUT_MS);
      return () => clearTimeout(t);
    }
  }, [phase]);

  useEffect(() => {
    if (phase === "gone") markSplashGone();
  }, [phase]);

  if (phase === "gone") return null;
  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{
        backgroundColor: SPLASH_BACKGROUND,
        // Not quite opaque once the logo starts to go, so the screen beneath is
        // drawn already (a fully opaque cover lets the browser skip it), and the
        // dissolve doesn't stall on drawing it.
        opacity: phase === "background-out" ? 0 : phase === "showing" ? 1 : 0.999,
        transition: `opacity ${BACKGROUND_OUT_MS}ms ease-out`,
        willChange: "opacity",
        // Taps go through once the screen beneath is coming into view.
        pointerEvents: phase === "background-out" ? "none" : "auto",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logo.src}
        alt=""
        width={SPLASH_LOGO_SIZE}
        height={SPLASH_LOGO_SIZE}
        onTransitionEnd={(e) => {
          if (e.propertyName === "opacity" && phase === "logo-out") logoGone();
        }}
        style={{
          opacity: phase === "showing" ? 1 : 0,
          transform: phase === "showing" ? "scale(1)" : "scale(0.94)",
          transition: `opacity ${LOGO_OUT_MS}ms ease-out, transform ${LOGO_OUT_MS}ms ease-out`,
        }}
      />
    </div>
  );
}
