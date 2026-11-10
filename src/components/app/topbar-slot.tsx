"use client";
import { createContext, useContext, useState } from "react";
import { createPortal } from "react-dom";

/**
 * A spot in the middle of the top bar that the current screen can fill, used
 * for the month picker on Home, Budget and Detailed Reports. The screen
 * renders <TopbarSlot> where it likes, and the content shows up in the bar.
 * It's a portal, so it keeps the screen's context (such as MonthScope), and
 * it disappears when the screen unmounts.
 */
const SlotContext = createContext<{ el: HTMLElement | null; setEl: (el: HTMLElement | null) => void } | null>(null);

export function TopbarSlotProvider({ children }: { children: React.ReactNode }) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  return <SlotContext.Provider value={{ el, setEl }}>{children}</SlotContext.Provider>;
}

/** The empty spot in the top bar, which the screen's content portals into. */
export function TopbarSlotTarget({ className }: { className?: string }) {
  const ctx = useContext(SlotContext);
  return <div ref={ctx?.setEl} className={className} />;
}

export function TopbarSlot({ children }: { children: React.ReactNode }) {
  const el = useContext(SlotContext)?.el;
  return el ? createPortal(children, el) : null;
}
