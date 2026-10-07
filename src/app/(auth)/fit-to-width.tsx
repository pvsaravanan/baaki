"use client";
import { useLayoutEffect, useRef, useState } from "react";

/**
 * Lays its children out at the design's exact width, then scales the whole
 * thing to the available width — pixel-exact at the design size and
 * proportional on every other screen (the text, chart and gaps keep their
 * relationships instead of reflowing into each other). The scaled box is made
 * as tall as the container divided by the scale, so a vertically centred
 * layout inside stays centred.
 */
export function FitToWidth({
  designWidth,
  maxScale = 1.25,
  children,
}: {
  designWidth: number;
  maxScale?: number;
  children: React.ReactNode;
}) {
  const outer = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ scale: number; height: number } | null>(null);

  useLayoutEffect(() => {
    const el = outer.current;
    if (!el) return;
    const measure = () => {
      // Hidden (display: none) at some screen sizes: nothing to measure, and a
      // zero width would make the height 0 / 0 = NaN.
      if (el.clientWidth === 0) return;
      const scale = Math.min(maxScale, el.clientWidth / designWidth);
      setBox({ scale, height: el.clientHeight / scale });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [designWidth, maxScale]);

  return (
    <div ref={outer} className="absolute inset-0 overflow-hidden">
      <div
        style={{
          width: designWidth,
          height: box ? box.height : "100%",
          transform: box ? `scale(${box.scale})` : undefined,
          transformOrigin: "top left",
          // Hidden until measured, so it never flashes at the wrong size.
          visibility: box ? "visible" : "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}
