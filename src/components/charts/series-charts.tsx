"use client";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { formatINRCompact } from "@/lib/money";
import { AXIS_TICK, TooltipBox, useChartColors } from "./theme";

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
