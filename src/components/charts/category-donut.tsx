"use client";
import { Cell, Pie, PieChart, ResponsiveContainer, Sector, Tooltip } from "recharts";
import { categoryIconSrc } from "@/components/app/category-icon";
import { pieMidAngles, spreadAngles } from "./donut-icon-layout";
import { TooltipBox, useChartColors } from "./theme";

const RADIAN = Math.PI / 180;

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
          <image href={categoryIconSrc(d.icon, size)} width={size} height={size} />
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
