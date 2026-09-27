"use client";
import { useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { IncomeExpenseBars } from "@/components/charts/chart-kit";
import { SelectMenu } from "@/components/ui/select-menu";

type Range = "1m" | "3m" | "6m" | "1y";

const OPTIONS: { value: Range; label: string }[] = [
  { value: "1m", label: "This month" },
  { value: "3m", label: "Last 3 months" },
  { value: "6m", label: "Last 6 months" },
  { value: "1y", label: "Last 12 months" },
];
const MONTHS: Record<Range, number> = { "1m": 1, "3m": 3, "6m": 6, "1y": 12 };

type Point = { label: string; month: number; year: number; income: number; expense: number };

/**
 * Income vs expenses chart with a timeline dropdown. The server provides up to
 * 12 months of trend; changing the range just slices it client-side.
 */
export function IncomeExpenseCard({ trend }: { trend: Point[] }) {
  const [range, setRange] = useState<Range>("6m");
  const sliced = trend.slice(-MONTHS[range]);
  // Anchor the axis with a year: at every January (a real year boundary) and,
  // on the 1Y view, at the first bar so the starting year is clear too.
  const data = sliced.map((p, i) => ({
    ...p,
    label: p.month === 1 || (range === "1y" && i === 0) ? `${p.label} '${String(p.year).slice(-2)}` : p.label,
  }));

  return (
    <Card>
      <CardHeader
        title="Income vs expenses"
        action={
          <SelectMenu
            ariaLabel="Timeline"
            value={range}
            onChange={(v) => setRange(v as Range)}
            options={OPTIONS}
            size="sm"
            className="min-w-[150px]"
          />
        }
      />
      <CardBody className="pt-2">
        <IncomeExpenseBars data={data} />
      </CardBody>
    </Card>
  );
}
