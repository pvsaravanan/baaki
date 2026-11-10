"use client";
import { useEffect, useRef, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";

/** How far a finger moves before it counts as a swipe rather than a tap. */
const SLOP = 8;
/** Follows the finger exactly while dragging; settles with an ease otherwise. */
const EASE = "220ms cubic-bezier(0.2, 0, 0, 1)";
/** Long enough for a full-screen editor to have slid up over the row (Modal's sheet-up). */
const COVERED_MS = 320;

/**
 * A row or card that swipes left to reveal Edit and Delete. It follows the
 * finger, then settles open (past half the actions' width) or closed. Vertical
 * moves are left to the page, so lists still scroll. Open, a tap anywhere
 * closes it and does nothing else, as in a mail app; a tap on it otherwise
 * does what the content does (open the item).
 *
 * The outer element (`className`) stays put, so give it the border and
 * corners; the content (`contentClassName`) is what slides.
 */
export function SwipeActions({
  as: Outer = "div",
  name,
  onEdit,
  onDelete,
  enabled = true,
  actionWidth = 72,
  className,
  contentClassName,
  children,
}: {
  as?: "div" | "li";
  /** What the actions are for, for screen readers ("Edit Coffee"). */
  name?: string;
  onEdit: () => void;
  /** May wait (it usually asks first): the row stays open until it's done. */
  onDelete: () => void | Promise<unknown>;
  /** Off (no swipe, no actions), e.g. while selecting rows. */
  enabled?: boolean;
  /** Width of each action; narrower on small cards. */
  actionWidth?: number;
  className?: string;
  contentClassName?: string;
  children: React.ReactNode;
}) {
  const width = actionWidth * 2;
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  // An action is under way (its editor or confirmation is up): the row stays
  // open, and taps in that dialog are left alone.
  const [acting, setActing] = useState(false);
  // Closes without sliding, once out of sight.
  const [instant, setInstant] = useState(false);
  const outerRef = useRef<HTMLElement>(null);
  const start = useRef<{ x: number; y: number; offset: number; swiping: boolean } | null>(null);
  // A swipe ends with a click on whatever was under the finger: swallow it.
  const swallowClick = useRef(false);
  const open = offset !== 0;
  const close = () => setOffset(0);

  // Open, it closes at a touch anywhere else (another row, the page), and
  // that touch does nothing more.
  useEffect(() => {
    if (!open || acting) return;
    const outside = (e: PointerEvent) => {
      if (outerRef.current?.contains(e.target as Node)) return;
      setOffset(0);
      const swallow = (click: MouseEvent) => {
        click.preventDefault();
        click.stopPropagation();
      };
      document.addEventListener("click", swallow, { capture: true, once: true });
      // A touch that turns into a scroll never clicks: stop waiting for it.
      setTimeout(() => document.removeEventListener("click", swallow, { capture: true }), 600);
    };
    document.addEventListener("pointerdown", outside, true);
    return () => document.removeEventListener("pointerdown", outside, true);
  }, [open, acting]);

  // The editor slides up over the row; behind it, the row snaps shut unseen,
  // rather than sliding back into place as the editor arrives.
  const edit = () => {
    setActing(true);
    onEdit();
    setTimeout(() => {
      setInstant(true);
      setOffset(0);
      setActing(false);
      setTimeout(() => setInstant(false), 50);
    }, COVERED_MS);
  };

  // The row stays open while Delete asks, so it's clear which one; it closes
  // once that's settled (and if it was deleted, it's gone anyway).
  const remove = async () => {
    setActing(true);
    try {
      await onDelete();
    } finally {
      setActing(false);
      setOffset(0);
    }
  };

  const settle = () => {
    start.current = null;
    setDragging(false);
    setOffset((o) => (o < -width / 2 ? -width : 0));
  };

  const handlers = enabled
    ? {
        onPointerDown(e: React.PointerEvent) {
          if (e.pointerType === "mouse" && e.button !== 0) return;
          // A finger's swipe ends without a click (a mouse's ends with one):
          // whatever was waiting to be swallowed, a new touch is a new tap.
          swallowClick.current = false;
          start.current = { x: e.clientX, y: e.clientY, offset, swiping: false };
        },
        onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
          const s = start.current;
          if (!s) return;
          const dx = e.clientX - s.x;
          const dy = e.clientY - s.y;
          if (!s.swiping) {
            if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return;
            if (Math.abs(dy) >= Math.abs(dx)) {
              start.current = null; // a scroll
              return;
            }
            s.swiping = true;
            setDragging(true);
            e.currentTarget.setPointerCapture(e.pointerId);
          }
          let next = Math.min(0, s.offset + dx);
          // Past the actions it gives, but only a little.
          if (next < -width) next = -width + (next + width) / 3;
          setOffset(next);
        },
        onPointerUp() {
          if (!start.current?.swiping) {
            start.current = null;
            return;
          }
          swallowClick.current = true;
          settle();
        },
        onPointerCancel() {
          if (start.current?.swiping) settle();
          else start.current = null;
        },
        onClickCapture(e: React.MouseEvent) {
          // The click that ends a swipe does nothing; a tap on an open row closes it.
          if (swallowClick.current) swallowClick.current = false;
          else if (open) close();
          else return;
          e.preventDefault();
          e.stopPropagation();
        },
        // A link's native drag (with a mouse) would cut the swipe short.
        onDragStart(e: React.DragEvent) {
          e.preventDefault();
        },
      }
    : {};

  const action = "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 overflow-hidden text-[11px] font-medium";

  return (
    <Outer ref={outerRef as React.Ref<never>} className={cn("relative overflow-hidden", className)}>
      {enabled && (
        // Behind the right edge, as wide as the swipe has revealed.
        <div
          className="absolute inset-y-0 right-0 flex overflow-hidden"
          style={{ width: -offset, transition: dragging || instant ? "none" : `width ${EASE}` }}
        >
          <button
            type="button"
            onClick={edit}
            onFocus={() => setOffset(-width)}
            aria-label={name ? `Edit ${name}` : undefined}
            className={cn(action, "bg-surface-2 text-fg")}
          >
            <Pencil aria-hidden className="h-4 w-4 shrink-0" />
            Edit
          </button>
          <button
            type="button"
            onClick={remove}
            onFocus={() => setOffset(-width)}
            aria-label={name ? `Delete ${name}` : undefined}
            className={cn(action, "bg-expense text-white")}
          >
            <Trash2 aria-hidden className="h-4 w-4 shrink-0" />
            Delete
          </button>
        </div>
      )}
      <div
        {...handlers}
        className={cn("relative touch-pan-y", contentClassName)}
        style={{
          transform: offset ? `translateX(${offset}px)` : undefined,
          transition: dragging || instant ? "none" : `transform ${EASE}, background-color 150ms`,
        }}
      >
        {children}
      </div>
    </Outer>
  );
}
