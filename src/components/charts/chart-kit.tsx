"use client";
import { useEffect, useId, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  PolarAngleAxis, RadialBar, RadialBarChart, ReferenceLine, ResponsiveContainer, Sector, Tooltip, XAxis, YAxis,
} from "recharts";
import { useTheme } from "@/components/theme-provider";
import { categoryIconSrc } from "@/components/app/category-icon";
import { isSilhouetteIcon } from "@/lib/category-icons";
import { pieMidAngles, spreadAngles } from "./donut-icon-layout";
import { formatINR, formatINRCompact } from "@/lib/money";

const RADIAN = Math.PI / 180;

/** Resolve themed colors from CSS variables at runtime (client only). */
export function useChartColors() {
  const { resolved } = useTheme();
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
  }, [resolved]);
  return colors;
}

interface TooltipEntry {
  name?: string | number;
  value?: string | number;
  color?: string;
}

function TooltipBox({
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

const AXIS_TICK = { fontSize: 11 };

/** Grouped income-vs-expense (or any multi-series) bar chart. */
export function IncomeExpenseBars({
  data, height = 260,
}: {
  data: { label: string; income: number; expense: number }[];
  height?: number;
}) {
  const colors = useChartColors();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={4}>
        <CartesianGrid vertical={false} stroke={colors.grid} strokeDasharray="0" />
        <XAxis dataKey="label" tick={{ ...AXIS_TICK, fill: colors.axis }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={(v) => formatINRCompact(v)} tick={{ ...AXIS_TICK, fill: colors.axis }} axisLine={false} tickLine={false} width={60} />
        <Tooltip cursor={{ fill: colors.grid, opacity: 0.4 }} content={(props: unknown) => <TooltipBox {...(props as Record<string, never>)} colors={colors} />} />
        <Bar dataKey="income" name="Income" fill={colors.income} radius={0} maxBarSize={40} />
        <Bar dataKey="expense" name="Expenses" fill={colors.expense} radius={0} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Single-series bar chart (e.g. daily spending). */
export function SpendBars({
  data, height = 220, color,
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
}) {
  const colors = useChartColors();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={colors.grid} strokeDasharray="0" />
        <XAxis dataKey="label" tick={{ ...AXIS_TICK, fill: colors.axis }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={16} />
        <YAxis tickFormatter={(v) => formatINRCompact(v)} tick={{ ...AXIS_TICK, fill: colors.axis }} axisLine={false} tickLine={false} width={60} />
        <Tooltip cursor={{ fill: colors.grid, opacity: 0.4 }} content={(props: unknown) => <TooltipBox {...(props as Record<string, never>)} colors={colors} />} />
        <Bar dataKey="value" name="Spent" fill={color ?? colors.fg} radius={0} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Area trend chart (spending / balance over time). */
export function TrendArea({
  data, height = 240, color, name = "Spending",
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  name?: string;
}) {
  const colors = useChartColors();
  const stroke = color ?? colors.brand;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={0.18} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={colors.grid} strokeDasharray="0" />
        <XAxis dataKey="label" tick={{ ...AXIS_TICK, fill: colors.axis }} axisLine={false} tickLine={false} minTickGap={20} />
        <YAxis tickFormatter={(v) => formatINRCompact(v)} tick={{ ...AXIS_TICK, fill: colors.axis }} axisLine={false} tickLine={false} width={60} />
        <Tooltip content={(props: unknown) => <TooltipBox {...(props as Record<string, never>)} colors={colors} />} />
        <Area type="monotone" dataKey="value" name={name} stroke={stroke} strokeWidth={2} fill="url(#trendFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/**
 * Net savings per month (income − expenses) as diverging bars around a zero
 * baseline: green when positive (saved), red when negative (overspent).
 */
export function NetSavingsBars({
  data, height = 260,
}: {
  data: { label: string; net: number }[];
  height?: number;
}) {
  const colors = useChartColors();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={colors.grid} strokeDasharray="0" />
        <XAxis dataKey="label" tick={{ ...AXIS_TICK, fill: colors.axis }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={12} />
        <YAxis tickFormatter={(v) => formatINRCompact(v)} tick={{ ...AXIS_TICK, fill: colors.axis }} axisLine={false} tickLine={false} width={60} />
        <ReferenceLine y={0} stroke={colors.border} strokeWidth={1} />
        <Tooltip cursor={{ fill: colors.grid, opacity: 0.4 }} content={(props: unknown) => <TooltipBox {...(props as Record<string, never>)} colors={colors} />} />
        <Bar dataKey="net" name="Net savings" radius={0} maxBarSize={40}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.net >= 0 ? colors.income : colors.expense} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Change in net spend per category vs last month, as horizontal diverging bars:
 * bars extend right + red when spend rose, left + green when it fell.
 */
export function CategoryChangeBars({
  data, height = 300,
}: {
  data: { name: string; delta: number }[];
  height?: number;
}) {
  const colors = useChartColors();
  if (!data.length) return null;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart layout="vertical" data={data} margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
        <CartesianGrid horizontal={false} stroke={colors.grid} strokeDasharray="0" />
        <XAxis type="number" tickFormatter={(v) => formatINRCompact(v)} tick={{ ...AXIS_TICK, fill: colors.axis }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" width={96} tick={{ ...AXIS_TICK, fill: colors.axis }} axisLine={false} tickLine={false} />
        <ReferenceLine x={0} stroke={colors.border} strokeWidth={1} />
        <Tooltip cursor={{ fill: colors.grid, opacity: 0.4 }} content={(props: unknown) => <TooltipBox {...(props as Record<string, never>)} colors={colors} />} />
        <Bar dataKey="delta" name="Change" radius={0} maxBarSize={18}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.delta >= 0 ? colors.expense : colors.income} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Cumulative spend through the month vs an even "ideal pace" line and (when set)
 * a budget ceiling — shows whether spending is ahead of plan.
 */
export function SpendingPaceLine({
  data, budget, height = 260,
}: {
  data: { label: string; cumulative: number; ideal: number | null }[];
  budget: number | null;
  height?: number;
}) {
  const colors = useChartColors();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={colors.grid} strokeDasharray="0" />
        <XAxis dataKey="label" tick={{ ...AXIS_TICK, fill: colors.axis }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
        <YAxis tickFormatter={(v) => formatINRCompact(v)} tick={{ ...AXIS_TICK, fill: colors.axis }} axisLine={false} tickLine={false} width={60} />
        {budget ? <ReferenceLine y={budget} stroke={colors.expense} strokeDasharray="4 4" strokeWidth={1.5} /> : null}
        <Tooltip content={(props: unknown) => <TooltipBox {...(props as Record<string, never>)} colors={colors} />} />
        <Legend wrapperStyle={{ fontSize: 11 }} iconType="plainline" />
        {data.some((d) => d.ideal !== null) && (
          <Line type="monotone" dataKey="ideal" name="Even pace" stroke={colors.axis} strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
        )}
        <Line type="monotone" dataKey="cumulative" name="Spent so far" stroke={colors.brand} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Shared semicircular-gauge rendering — see SavingsGauge/BudgetGauge below. */
function GaugeBase({
  value, height, color, gridColor, valueLabel, subtitle,
}: {
  value: number;
  height: number;
  color: string;
  gridColor: string;
  valueLabel: string;
  subtitle: string;
}) {
  const data = [{ name: "value", value: Math.max(0, Math.min(value, 100)), fill: color }];
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <RadialBarChart innerRadius="68%" outerRadius="100%" data={data} startAngle={180} endAngle={0} barSize={18}>
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar background={{ fill: gridColor }} dataKey="value" cornerRadius={0} angleAxisId={0} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 bottom-2 flex flex-col items-center">
        <span className="tnum text-headline-md tracking-tight" style={{ color }}>
          {valueLabel}
        </span>
        <span className="text-label-sm uppercase text-muted">{subtitle}</span>
      </div>
    </div>
  );
}

/** Semicircular gauge for a percentage (e.g. savings rate). */
export function SavingsGauge({ value, height = 168 }: { value: number; height?: number }) {
  const colors = useChartColors();
  const color = value >= 20 ? colors.income : value >= 0 ? colors.brand : colors.expense;
  return (
    <GaugeBase value={value} height={height} color={color} gridColor={colors.grid} valueLabel={`${value.toFixed(0)}%`} subtitle="of income saved" />
  );
}

/** Semicircular gauge for budget utilization (e.g. a category's monthly budget). */
export function BudgetGauge({ value, height = 168 }: { value: number; height?: number }) {
  const colors = useChartColors();
  const color = value > 100 ? colors.expense : value >= 90 ? colors.brand : colors.income;
  return (
    <GaugeBase value={value} height={height} color={color} gridColor={colors.grid} valueLabel={`${value.toFixed(0)}%`} subtitle="of budget used" />
  );
}

interface PieLabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  outerRadius: number;
  index: number;
}

interface PieActiveShapeProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
  fill: string;
}

// Slice geometry, shared by the Pie and the icon layout that mirrors it.
const DONUT_PADDING_ANGLE = 3;
const DONUT_MIN_ANGLE = 4;
const DONUT_ICON_SIZE = 20;
/** Icon centers sit this far outside the ring: clear of a selected slice's
 *  pop-out (~10px) and still inside the chart box at the 76% outer radius. */
const DONUT_ICON_OFFSET = 26;

type DonutProps = {
  data: { name: string; value: number; color: string; icon?: string }[];
  activeIndex?: number | null;
  /** Transient hover/touch preview. */
  onHoverIndexChange?: (index: number | null) => void;
  /** A tap/click — the caller decides whether that toggles a persistent selection. */
  onSelectIndex?: (index: number) => void;
};

/**
 * Donut chart for category breakdown. Each slice carries its own color and its
 * category icon just outside the ring — a direct, at-a-glance key instead of a
 * color swatch list the reader has to cross-reference. Icons of small
 * neighbouring slices are spread apart so none overlap, and every icon has a
 * thin line back to its slice. `activeIndex` rings and pops the
 * matching slice outward and dims the rest; hovering/tapping either the
 * slice or its icon drives it via `onHoverIndexChange`/`onSelectIndex`.
 */
export function CategoryDonut({ height = 260, ...props }: DonutProps & { height?: number }) {
  if (!props.data.length) return null;
  // ResponsiveContainer measures itself and hands its width/height to the
  // chart below, which sizes the ring in pixels from them.
  return (
    <ResponsiveContainer width="100%" height={height}>
      <DonutChart {...props} />
    </ResponsiveContainer>
  );
}

function DonutChart({
  data, activeIndex = null, onHoverIndexChange, onSelectIndex, width = 0, height = 0,
}: DonutProps & { width?: number; height?: number }) {
  const colors = useChartColors();
  const invertSilhouettes = useTheme().resolved === "dark";
  const uid = useId().replace(/:/g, "");

  // Size the ring so the icons around it always fit inside the chart box,
  // whatever the box's size: the outer edge leaves room for the icon offset
  // plus half an icon. A thick ring (inner at ~2/3 of outer) keeps slices
  // easy to tap.
  const maxRadius = Math.min(width, height) / 2;
  const outerRadius = Math.max(0, maxRadius - DONUT_ICON_OFFSET - DONUT_ICON_SIZE / 2 - 2);
  const innerRadius = outerRadius * 0.66;
  const iconRadius = outerRadius + DONUT_ICON_OFFSET;

  // Where each icon goes: start at its slice's middle, then spread neighbours
  // apart so none overlap.
  const mids = pieMidAngles(data.map((d) => d.value), DONUT_PADDING_ANGLE, DONUT_MIN_ANGLE);
  const shown = data.map((_, i) => i).filter((i) => data[i].value > 0);
  // Angle whose chord is 28px — a 20px icon's diagonal plus a hair, which is
  // also its tap box — so no two icons or tap targets overlap.
  const minSep = iconRadius > 0 ? (2 * Math.asin(Math.min(1, (DONUT_ICON_SIZE / 2 + 4) / iconRadius)) * 180) / Math.PI : 0;
  const spread = spreadAngles(shown.map((i) => mids[i]), minSep);
  const iconAngles = new Map(shown.map((i, k) => [i, spread[k]]));

  const renderIcon = (props: unknown) => {
    const { cx, cy, midAngle, index } = props as PieLabelProps;
    const d = data[index];
    const angle = iconAngles.get(index);
    if (angle === undefined) return <g key={index} />;
    const size = DONUT_ICON_SIZE;
    const x = cx + iconRadius * Math.cos(-angle * RADIAN);
    const y = cy + iconRadius * Math.sin(-angle * RADIAN);
    // A straight connector from the slice's outer edge (at its middle, past
    // the pop-out when it's selected) aimed at the icon's center, stopping at
    // the icon — drawn for every slice, whether or not its icon was spread.
    const startR = outerRadius + (index === activeIndex ? 11 : 2);
    const sx = cx + startR * Math.cos(-midAngle * RADIAN);
    const sy = cy + startR * Math.sin(-midAngle * RADIAN);
    const dist = Math.hypot(x - sx, y - sy);
    const stopShort = size / 2 + 2;
    const line =
      dist > stopShort + 2
        ? { x2: x - ((x - sx) / dist) * stopShort, y2: y - ((y - sy) / dist) * stopShort }
        : null;
    return (
      <g key={index}>
        {line && (
          <line
            x1={sx}
            y1={sy}
            x2={line.x2}
            y2={line.y2}
            stroke={colors.axis}
            strokeOpacity={0.6}
            strokeWidth={1}
            strokeLinecap="round"
            pointerEvents="none"
          />
        )}
        <g
          data-donut-slice
          transform={`translate(${x - size / 2}, ${y - size / 2})`}
          style={{ cursor: "pointer" }}
          onMouseEnter={() => onHoverIndexChange?.(index)}
          onMouseLeave={() => onHoverIndexChange?.(null)}
          onClick={() => onSelectIndex?.(index)}
        >
          {/* A few px of slack around the icon so it's an easy tap target. */}
          <rect x={-4} y={-4} width={size + 8} height={size + 8} fill="transparent" />
          {/* All-black silhouette icons vanish on the dark theme: invert them
              to light ink there (an SVG filter — CSS filters on SVG content
              aren't reliable in every browser). */}
          {invertSilhouettes && isSilhouetteIcon(d.icon) && (
            <filter id={`${uid}-inv-${index}`}>
              <feColorMatrix type="matrix" values="-1 0 0 0 1  0 -1 0 0 1  0 0 -1 0 1  0 0 0 1 0" />
            </filter>
          )}
          <image
            href={categoryIconSrc(d.icon, size)}
            width={size}
            height={size}
            filter={invertSilhouettes && isSilhouetteIcon(d.icon) ? `url(#${uid}-inv-${index})` : undefined}
          />
        </g>
      </g>
    );
  };

  const renderActiveShape = (props: unknown) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill } = props as PieActiveShapeProps;
    // Nudge the slice outward along its own angle — a genuine "pulled out"
    // wedge rather than just a bigger one.
    const offset = 6;
    const mx = cx + offset * Math.cos(-midAngle * RADIAN);
    const my = cy + offset * Math.sin(-midAngle * RADIAN);
    return (
      <Sector
        cx={mx}
        cy={my}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 3}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        stroke={colors.fg}
        strokeWidth={2}
      />
    );
  };

  return (
    <PieChart width={width} height={height}>
      <Pie
        data={data}
        dataKey="value"
        nameKey="name"
        cx="50%"
        cy="50%"
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        // Clear gaps between slices, and a minimum slice angle so a tiny
        // category is still a finger-sized target.
        paddingAngle={DONUT_PADDING_ANGLE}
        minAngle={DONUT_MIN_ANGLE}
        stroke="none"
        label={renderIcon}
        labelLine={false}
        // The label icons only get final geometry once the Pie's own grow-in
        // animation finishes, so leaving that on meant the chart rendered a
        // full second-plus with no icons before they popped in.
        isAnimationActive={false}
        activeIndex={activeIndex ?? undefined}
        activeShape={renderActiveShape}
        onMouseEnter={(_, i) => onHoverIndexChange?.(i)}
        onMouseLeave={() => onHoverIndexChange?.(null)}
        onClick={(_, i) => onSelectIndex?.(i)}
      >
        {data.map((d, i) => (
          <Cell
            key={i}
            fill={d.color}
            opacity={activeIndex === null || activeIndex === i ? 1 : 0.35}
            className="cursor-pointer transition-opacity"
          />
        ))}
      </Pie>
      {/* An interactive donut's caller shows the active slice in its own
          center readout; a tooltip on top would repeat it and, on touch,
          stay stuck over that readout after a tap. */}
      {!onHoverIndexChange && (
        <Tooltip content={(props: unknown) => <TooltipBox {...(props as Record<string, never>)} colors={colors} />} />
      )}
    </PieChart>
  );
}
