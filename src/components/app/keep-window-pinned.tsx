"use client";
import { useEffect } from "react";

const isTextField = (el: Element | null) =>
  el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

/**
 * The app frame fills the screen and scrolls inside <main>, so the window
 * itself should never scroll. iOS Safari scrolls it anyway to lift a focused
 * field above the keyboard, and after the keyboard closes it often leaves it
 * scrolled: the whole app floats off-centre and taps land on the wrong spot
 * (they hit where things used to be, so buttons seem not to respond).
 * Once no text field has focus, put the window back at the top.
 */
export function KeepWindowPinned() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const settle = () => {
      clearTimeout(timer);
      // Wait for focus to move: tapping from one field to the next fires
      // focusout first, and the keyboard should stay put in between.
      timer = setTimeout(() => {
        if (isTextField(document.activeElement)) return;
        if (window.scrollX !== 0 || window.scrollY !== 0) window.scrollTo(0, 0);
      }, 120);
    };
    const vv = window.visualViewport;
    document.addEventListener("focusout", settle);
    vv?.addEventListener("resize", settle);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("focusout", settle);
      vv?.removeEventListener("resize", settle);
    };
  }, []);
  return null;
}
