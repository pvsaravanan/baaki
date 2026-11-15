export const PAD = 6; // space around a lit control
export const GAP = 12; // between the control and the card
export const EDGE = 12; // the card's distance from the screen edge
export const FADE_MS = 280; // the words crossfading, and the progress dots
export const CLOSE_MS = 240;
/** How long to wait for a control that hasn't appeared before centring the card instead. */
export const HOLD_MS = 800;
/** The lit hole's corner radius (rounded-xl). */
export const CORNER = 12;
/** Where each corner piece's arc is centred: the opposite corner of its own box. */
export const CORNER_AT = ["100% 100%", "0 100%", "100% 0", "0 0"];
/** Short hops are quick and long ones take longer, so every move feels the same speed. */
export const moveMs = (distance: number) => Math.min(640, Math.max(380, 300 + distance * 0.32));

export type Rect = { top: number; left: number; width: number; height: number };

/** Where the light and the card are (or are heading), in screen pixels. */
export interface Frame {
  x: number;
  y: number;
  w: number;
  h: number;
  /** The outline's opacity: 0 when a step lights nothing. */
  ring: number;
  cx: number;
  cy: number;
}

/** The first matching element that is actually on screen (a phone and a desktop control can share a selector). */
export function findElement(selector: string): HTMLElement | null {
  for (const el of Array.from(document.querySelectorAll<HTMLElement>(selector))) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

/**
 * Where the control is on screen. A control inside the scrolling page is cut
 * to what that page actually shows, so the light never outlines a part that is
 * scrolled out of sight.
 */
export function findTarget(selector: string): Rect | null {
  const el = findElement(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const view = el.closest("main")?.getBoundingClientRect();
  const top = view ? Math.max(r.top, view.top) : r.top;
  const bottom = view ? Math.min(r.bottom, view.bottom) : r.bottom;
  if (bottom <= top) return null;
  return { top, left: r.left, width: r.width, height: bottom - top };
}

/**
 * Scrolls the page so a control inside it is fully in view, with a little room
 * around it. The keyboard opening or closing can leave the page scrolled a few
 * pixels, which would hide the top of what the step is pointing at.
 */
export function reveal(selector: string) {
  const el = findElement(selector);
  const main = el?.closest("main");
  if (!el || !main) return;
  const r = el.getBoundingClientRect();
  const m = main.getBoundingClientRect();
  const room = 16;
  if (r.top < m.top + room) main.scrollTop -= m.top + room - r.top;
  else if (r.bottom > m.bottom - room) main.scrollTop += r.bottom - (m.bottom - room);
}

/** Slow in at the start, long soft landing: reads as one continuous glide. */
export const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function reducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}
