"use client";
import { useEffect, useState } from "react";
import { CategoryDonut } from "@/components/charts/chart-kit";
import { Money } from "@/components/money";

type Slice = { name: string; value: number; color: string; icon?: string };

/**
 * Category donut with a center readout. Hovering or tapping a slice or its
 * icon pops that slice out and shows its name and amount in the center; a tap
 * pins it until you tap anywhere else (the center, the card, the page), which
 * returns to the total.
 */
export function InteractiveCategoryDonut({
  data,
  height,
  total,
  totalLabel,
  labelClassName = "text-2xs text-muted",
}: {
  data: Slice[];
  height: number;
  /** Shown in the center when no slice is selected (paise). */
  total: number;
  totalLabel: string;
  labelClassName?: string;
}) {
  // Hover previews; a click/tap pins a selection that survives the mouse
  // leaving, so a tap on a touch device doesn't just flash and revert.
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [lockedIndex, setLockedIndex] = useState<number | null>(null);
  const activeIndex = hoverIndex ?? lockedIndex;
  const activeItem = activeIndex !== null ? data[activeIndex] : null;

  // Any press that isn't on a slice or its icon resets the chart. Hover is
  // cleared too: on touch there's no mouseleave, so a tapped slice's hover
  // state would otherwise keep it highlighted.
  useEffect(() => {
    if (activeIndex === null) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (target?.closest(".recharts-sector, [data-donut-slice]")) return;
      setLockedIndex(null);
      setHoverIndex(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [activeIndex]);

  return (
    <div className="relative">
      <CategoryDonut
        data={data}
        height={height}
        activeIndex={activeIndex}
        onHoverIndexChange={setHoverIndex}
        onSelectIndex={(i) => setLockedIndex((cur) => (cur === i ? null : i))}
      />
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className={labelClassName}>{activeItem ? activeItem.name : totalLabel}</span>
        <Money paise={activeItem ? activeItem.value : total} tone="default" className="text-base font-semibold" compact />
      </div>
    </div>
  );
}
