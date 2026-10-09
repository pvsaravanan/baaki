"use client";
import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";
import { useChartColors } from "./theme";

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
