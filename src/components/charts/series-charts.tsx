"use client";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { formatINRCompact } from "@/lib/money";
import { AXIS_TICK, TooltipBox, useChartColors } from "./theme";

/** Grouped income-vs-expense (or any multi-series) bar chart. */
export function IncomeExpenseBars({
  data, height = 260, rounded = false,
}: {
  data: { label: string; income: number; expense: number }[];
  height?: number;
  /** Soft tops on the bars. */
  rounded?: boolean;
}) {
  const radius: number | [number, number, number, number] = rounded ? [4, 4, 0, 0] : 0;
  const colors = useChartColors();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={4}>
        <CartesianGrid vertical={false} stroke={colors.grid} strokeDasharray="0" />
        <XAxis dataKey="label" tick={{ ...AXIS_TICK, fill: colors.axis }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={(v) => formatINRCompact(v)} tick={{ ...AXIS_TICK, fill: colors.axis }} axisLine={false} tickLine={false} width={60} />
        <Tooltip cursor={{ fill: colors.grid, opacity: 0.4 }} content={(props: unknown) => <TooltipBox {...(props as Record<string, never>)} colors={colors} />} />
        <Bar dataKey="income" name="Income" fill={colors.income} radius={radius} maxBarSize={40} />
        <Bar dataKey="expense" name="Expenses" fill={colors.expense} radius={radius} maxBarSize={40} />
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

/** Spending by month, with the months of the chosen period picked out in colour and a bolder label. */
export function PeriodBars({
  data, height = 200,
}: {
  data: { label: string; value: number; inPeriod: boolean }[];
  height?: number;
}) {
  const colors = useChartColors();
  const renderTick = ({ x, y, index, payload }: { x: number; y: number; index: number; payload: { value: string } }) => (
    <text x={x} y={y + 10} textAnchor="middle" fontSize={11} fontWeight={data[index]?.inPeriod ? 800 : 500} fill={data[index]?.inPeriod ? colors.fg : colors.axis}>
      {payload.value}
    </text>
  );
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={colors.grid} strokeDasharray="0" />
        <XAxis dataKey="label" tick={renderTick} axisLine={false} tickLine={false} interval={0} />
        <YAxis tickFormatter={(v) => formatINRCompact(v)} tick={{ ...AXIS_TICK, fill: colors.axis }} axisLine={false} tickLine={false} width={52} />
        <Tooltip cursor={{ fill: colors.grid, opacity: 0.4 }} content={(props: unknown) => <TooltipBox {...(props as Record<string, never>)} colors={colors} />} />
        <Bar dataKey="value" name="Spent" radius={[4, 4, 0, 0]} maxBarSize={40}>
          {data.map((d) => (
            <Cell key={d.label} fill={d.inPeriod ? "hsl(var(--brand-hover))" : "hsl(var(--brand-soft))"} />
          ))}
        </Bar>
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
