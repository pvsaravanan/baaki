"use client";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

/** Lightweight bottom sheet for mobile menus. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  bare = false,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /**
   * The children lay out their own header and footer, with room to scroll
   * between them; `title` only names the dialog. A centred card from `md` up,
   * where a full-width sheet would be mostly empty.
   */
  bare?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const FOCUSABLE =
      'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Only the topmost dialog closes (e.g. a form opened from this sheet).
        const dialogs = document.querySelectorAll('[aria-modal="true"]');
        if (dialogs[dialogs.length - 1] === panelRef.current?.parentElement) onClose();
        return;
      }
      // Trap Tab within the sheet so keyboard users can't reach the covered
      // page behind it.
      if (e.key === "Tab") {
        const els = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter(
          (el) => el.offsetParent !== null || el === document.activeElement,
        );
        if (els.length === 0) {
          e.preventDefault();
          return;
        }
        const first = els[0];
        const last = els[els.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey && (active === first || !panelRef.current?.contains(active))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    // A bare sheet takes focus itself: its first control may be one that acts
    // at once (Reset), which a stray Enter shouldn't press.
    const t = setTimeout(() => (bare ? panelRef.current : panelRef.current?.querySelector<HTMLElement>(FOCUSABLE))?.focus(), 40);
    return () => {
      document.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [open, onClose, bare]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className={cn("fixed inset-0 z-50 flex items-end", bare && "md:items-center md:justify-center md:p-6")} role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-overlay/60 animate-fade-in" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        tabIndex={bare ? -1 : undefined}
        className={cn(
          "relative z-10 w-full border-t-2 border-border bg-surface animate-sheet-up",
          bare
            ? "flex max-h-[92dvh] flex-col rounded-t-xl pt-2 outline-none md:max-w-lg md:rounded-xl md:border"
            : "rounded-xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]",
        )}
      >
        <div className={cn("mx-auto h-1 w-10 shrink-0 rounded-xl bg-border-strong", bare ? "mb-2 md:hidden" : "mb-3")} />
        {title && !bare && (
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-fg">{title}</h2>
            <button onClick={onClose} aria-label="Close" className="text-muted hover:text-fg">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}
