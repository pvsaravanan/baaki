"use client";
import { useSyncExternalStore } from "react";

/**
 * Whether the top bar still nudges toward choosing a profile picture. It does
 * while there's no picture, until the person has opened the picker once:
 * after that, no picture is a choice, not something they missed.
 */

const SEEN_KEY = "baaki.pictureNudgeSeen";
const CHANGED = "baaki:picture-nudge";

function seen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return true; // storage unavailable: don't nudge at all rather than forever
  }
}

/** The picker has been opened: stop nudging. */
export function markPictureNudgeSeen() {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {}
  window.dispatchEvent(new Event(CHANGED));
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGED, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGED, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** True once the picker has been opened. The static build renders it as seen (no nudge). */
export function usePictureNudgeSeen(): boolean {
  return useSyncExternalStore(subscribe, seen, () => true);
}

/** Settings address that opens the picker straight away. */
export const CHOOSE_PICTURE_HREF = "/settings?choose=picture";
