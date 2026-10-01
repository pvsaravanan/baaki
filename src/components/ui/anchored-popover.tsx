"use client";
import { forwardRef, useCallback, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

/**
 * A dropdown panel pinned to the element it opens from (a select's options,
 * a date or month picker).
 *
 * Drawn on top of the whole app (a portal with fixed positioning) instead of
 * inside the page, so it:
 * - is never cut off by a panel or form it sits in, and never makes that
 *   form taller or scroll to show it;
 * - stays attached to its trigger while anything scrolls or resizes (the
 *   on-screen keyboard included);
 * - opens upward when there isn't room below, and is capped to the space on
 *   screen, scrolling inside itself (without dragging the form along).
 *
 * The trigger's wrapper must be `position: relative`: the panel measures it
 * through a hidden marker stretched over it.
 */

type Width =
  /** Exactly the trigger's width. */
  | "trigger"
  /** A fixed width (px), right-aligned to the trigger (e.g. a row's "…" menu). */
  | number
  /** Full trigger width on phones; a fixed width, right-aligned to the trigger, from `sm` up. */
  | { sm: number };

const GAP = 6; // px between trigger and panel
const EDGE = 8; // px kept clear of the screen edges
const SM = 640; // Tailwind's `sm` breakpoint

interface Position {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  maxHeight: number;
  above: boolean;
}

export const AnchoredPopover = forwardRef<
  HTMLDivElement,
  {
    open: boolean;
    width?: Width;
    /** Height the panel would like; it flips above when that fits better there. */
    preferredHeight?: number;
    /** Never taller than this (px), even with room to spare. */
    maxHeight?: number;
    /** Receives the hidden marker, whose parent is the trigger's wrapper (for outside-tap checks). */
    markerRef?: React.RefObject<HTMLSpanElement | null>;
    /**
     * "panel" (default): the whole panel scrolls when it doesn't fit.
     * "content": the panel is a flex column that doesn't scroll itself; give
     * its middle section `min-h-0 flex-1 overflow-y-auto` so a header and
     * footer stay put.
     */
    scroll?: "panel" | "content";
    className?: string;
    role?: string;
    "aria-label"?: string;
    children: React.ReactNode;
  }
>(function AnchoredPopover(
  {
    open,
    width = "trigger",
    preferredHeight = 256,
    maxHeight = Infinity,
    markerRef: externalMarker,
    scroll = "panel",
    className,
    children,
    ...aria
  },
  ref,
) {
  const ownMarker = useRef<HTMLSpanElement>(null);
  const markerRef = externalMarker ?? ownMarker;
  const [pos, setPos] = useState<Position | null>(null);
  // Plain numbers, so an inline `width={{ sm: 320 }}` doesn't re-place every render.
  const fixedWidth = typeof width === "number" ? width : null;
  const smWidth = typeof width === "object" ? width.sm : null;

  const place = useCallback(() => {
    const anchor = markerRef.current;
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    // The visible area — shrinks when the on-screen keyboard is up.
    const vv = window.visualViewport;
    const viewTop = vv?.offsetTop ?? 0;
    const viewH = vv?.height ?? window.innerHeight;
    const viewW = document.documentElement.clientWidth;

    const below = viewTop + viewH - r.bottom - GAP - EDGE;
    const aboveSpace = r.top - viewTop - GAP - EDGE;
    const above = below < preferredHeight && aboveSpace > below;

    let panelW = r.width;
    let left = r.left;
    const fixed = fixedWidth ?? (smWidth !== null && viewW >= SM ? smWidth : null);
    if (fixed !== null) {
      panelW = fixed;
      left = r.right - panelW;
    }
    panelW = Math.min(panelW, viewW - 2 * EDGE);
    left = Math.min(Math.max(left, EDGE), viewW - EDGE - panelW);

    const next: Position = {
      ...(above ? { bottom: window.innerHeight - r.top + GAP } : { top: r.bottom + GAP }),
      left,
      width: panelW,
      maxHeight: Math.min(maxHeight, Math.max(120, above ? aboveSpace : below)),
      above,
    };
    // Skip the re-render when nothing moved (scroll events fire constantly).
    setPos((prev) =>
      prev &&
      prev.top === next.top &&
      prev.bottom === next.bottom &&
      prev.left === next.left &&
      prev.width === next.width &&
      prev.maxHeight === next.maxHeight
        ? prev
        : next,
    );
  }, [markerRef, preferredHeight, maxHeight, fixedWidth, smWidth]);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    place();
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(place);
    };
    // Capture: a scroll anywhere (the page, a form, a panel) moves the trigger.
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
    };
  }, [open, place]);

  return (
    <>
      <span ref={markerRef} aria-hidden className="pointer-events-none absolute inset-0" />
      {open &&
        pos &&
        createPortal(
          <div
            ref={ref}
            {...aria}
            data-popover
            style={{ top: pos.top, bottom: pos.bottom, left: pos.left, width: pos.width, maxHeight: pos.maxHeight }}
            className={cn(
              // Above the modal (z-50) and its backdrop.
              "fixed z-[70] overscroll-contain rounded-none border-2 border-border bg-surface shadow-stamp-lg animate-scale-in",
              scroll === "panel" ? "overflow-y-auto" : "flex flex-col overflow-hidden",
              pos.above ? "origin-bottom" : "origin-top",
              className,
            )}
          >
            {children}
          </div>,
          document.body,
        )}
    </>
  );
});

/**
 * True when a pointer-down lands inside the popover or on its trigger's
 * wrapper — i.e. not an "outside click" that should close it. (Tapping the
 * trigger itself must toggle, not close-then-reopen.)
 */
export function isInsidePopover(target: EventTarget | null, panel: HTMLElement | null, wrapper: HTMLElement | null) {
  const node = target as Node | null;
  return Boolean(node && (panel?.contains(node) || wrapper?.contains(node)));
}
