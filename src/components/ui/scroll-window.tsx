"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * A box that scrolls its content when it is shorter than it. The native
 * scrollbar is hidden (phones hide it anyway, and where it shows it takes
 * width and clips at rounded corners); a thin indicator drawn inside the box
 * stands in for it, so every list looks and sizes the same on every device.
 *
 * `height` fixes the box's height in px; leave it out to fit the content.
 * Put one child (the list) inside.
 */
export function ScrollWindow({
  id,
  kind,
  height,
  className,
  children,
}: {
  id?: string;
  /** Lets a parent tell its windows apart when it sizes them (see measureScrollWindows). */
  kind?: string;
  height?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<{ top: number; height: number } | null>(null);

  const update = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { clientHeight, scrollHeight, scrollTop } = el;
    if (scrollHeight <= clientHeight + 1) {
      setThumb((prev) => (prev === null ? prev : null));
      return;
    }
    // Kept clear of the box's rounded corners.
    const inset = 8;
    const track = clientHeight - inset * 2;
    const size = Math.max(28, (track * clientHeight) / scrollHeight);
    const top = inset + (track - size) * (scrollTop / (scrollHeight - clientHeight));
    const next = { top: Math.round(top), height: Math.round(size) };
    setThumb((prev) => (prev && prev.top === next.top && prev.height === next.height ? prev : next));
  }, []);

  // The content or the height may have changed with any render.
  useLayoutEffect(update);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [update]);

  return (
    <div
      id={id}
      data-scroll-window
      data-kind={kind}
      style={{ height }}
      className={cn("relative overflow-hidden transition-[height] duration-200", className)}
    >
      <div
        ref={scrollRef}
        className="h-full overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      {thumb && (
        <span
          aria-hidden
          data-scroll-thumb
          className="pointer-events-none absolute right-[3px] w-1 rounded-full bg-faint"
          style={{ top: thumb.top, height: thumb.height }}
        />
      )}
    </div>
  );
}

/** Each ScrollWindow under `area`, with the height its content would like (px, box included). */
export function measureScrollWindows(area: HTMLElement): { kind: string; natural: number; box: HTMLElement }[] {
  return [...area.querySelectorAll<HTMLElement>("[data-scroll-window]")].map((box) => {
    const content = box.firstElementChild?.firstElementChild as HTMLElement | null;
    const borders = box.offsetHeight - box.clientHeight;
    return { kind: box.dataset.kind ?? "", natural: (content?.offsetHeight ?? box.offsetHeight) + borders, box };
  });
}
