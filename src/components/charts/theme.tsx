"use client";
import { useEffect, useState } from "react";
import { formatINR } from "@/lib/money";

/** Resolve themed colors from CSS variables at runtime (client only). */
export function useChartColors() {
  const [colors, setColors] = useState({
    brand: "#d88060", income: "#2c6b4f", expense: "#b84b3a",
    grid: "#e5e7eb", axis: "#5f5f5f", surface: "#f4f1ea", border: "#1a1a1a", fg: "#1a1a1a",
  });
  useEffect(() => {
    const cs = getComputedStyle(document.documentElement);
    const v = (name: string) => {
      const raw = cs.getPropertyValue(name).trim();
      return raw ? `hsl(${raw})` : "";
    };
    setColors({
      brand: v("--brand") || "#d88060",
      income: v("--income") || "#2c6b4f",
      expense: v("--expense") || "#b84b3a",
      // Gridlines must use the FAINT rule, not the ink card border.
      grid: v("--border-faint") || "#e5e7eb",
      axis: v("--muted") || "#5f5f5f",
      surface: v("--surface") || "#f4f1ea",
      border: v("--border") || "#1a1a1a",
      fg: v("--fg") || "#1a1a1a",
    });
  }, []);
  return colors;
}

interface TooltipEntry {
  name?: string | number;
  value?: string | number;
  color?: string;
}

export function TooltipBox({
  active, payload, label, colors,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  colors: ReturnType<typeof useChartColors>;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-none border px-3 py-2 text-xs"
      style={{ background: colors.surface, borderColor: colors.border, color: colors.fg }}
    >
      {label && <p className="mb-1 text-label-sm uppercase">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 tabular-nums">
          <span className="h-2 w-2" style={{ background: p.color }} />
          <span className="text-muted">{String(p.name ?? "")}</span>
          <span className="ml-auto font-semibold">{formatINR(Number(p.value ?? 0))}</span>
        </div>
      ))}
    </div>
  );
}

export const AXIS_TICK = { fontSize: 11 };
