"use client";
import { createContext, useContext, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * A spot in the middle of the top bar that the current screen can fill, used
 * for the month picker on Home, Budget and Detailed Reports. The screen
 * renders <TopbarSlot> where it likes, and the content shows up in the bar.
 * It's a portal, so it keeps the screen's context (such as MonthScope), and
 * it disappears when the screen unmounts.
 */
const SlotContext = createContext<{
  el: HTMLElement | null;
  setEl: (el: HTMLElement | null) => void;
  banners: number;
  setBanners: React.Dispatch<React.SetStateAction<number>>;
} | null>(null);

export function TopbarSlotProvider({ children }: { children: React.ReactNode }) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  const [banners, setBanners] = useState(0);
  return <SlotContext.Provider value={{ el, setEl, banners, setBanners }}>{children}</SlotContext.Provider>;
}

/**
 * Called by a screen that shows its own banner (see PageBanner): on a phone the
 * top bar steps aside while it is on screen. A layout effect, so the bar is
 * already gone when the screen first paints.
 */
export function useBannerRegistration() {
  const setBanners = useContext(SlotContext)?.setBanners;
  useLayoutEffect(() => {
    setBanners?.((n) => n + 1);
    return () => setBanners?.((n) => n - 1);
  }, [setBanners]);
}

/** True while a screen's banner stands in for the top bar. */
export function useBannerActive(): boolean {
  return (useContext(SlotContext)?.banners ?? 0) > 0;
}

/** The empty spot in the top bar, which the screen's content portals into. */
export function TopbarSlotTarget({ className }: { className?: string }) {
  const ctx = useContext(SlotContext);
  return <div ref={ctx?.setEl} data-tour="month" className={className} />;
}

export function TopbarSlot({ children }: { children: React.ReactNode }) {
  const el = useContext(SlotContext)?.el;
  return el ? createPortal(children, el) : null;
}
