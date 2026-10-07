"use client";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { AnchoredPopover, isInsidePopover } from "./anchored-popover";

/**
 * A row's "…" actions menu, pinned to its button (see AnchoredPopover): it
 * floats above the list instead of stretching it, and flips upward near the
 * bottom of the screen. Closes on an outside tap or Escape (Android's Back).
 * Render it inside the button's `relative` wrapper.
 */
export function ActionMenu({
  open,
  onClose,
  width = 176,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  width?: number;
  label?: string;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!isInsidePopover(e.target, panelRef.current, markerRef.current?.parentElement ?? null)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      onClose();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open, onClose]);

  return (
    <AnchoredPopover
      ref={panelRef}
      markerRef={markerRef}
      open={open}
      role="menu"
      aria-label={label}
      width={width}
      preferredHeight={220}
      className="p-1"
    >
      {children}
    </AnchoredPopover>
  );
}

/** One entry in an ActionMenu. */
export function ActionMenuItem({
  icon,
  children,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-none px-2.5 py-1.5 text-sm transition-colors hover:bg-surface-2",
        danger ? "text-expense" : "text-fg",
      )}
    >
      <span className={danger ? "text-expense" : "text-muted"}>{icon}</span>
      {children}
    </button>
  );
}
