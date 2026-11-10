import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Money } from "@/components/money";
import { formatDelta } from "@/lib/money";
import { cn } from "@/lib/cn";

/**
 * A single dashboard/summary metric. `delta` is a percentage change vs the
 * previous period (null = not comparable → shown as "New"). `deltaGood`
 * controls whether an increase is coloured positively (income) or negatively
 * (expenses).
 */
export function StatCard({
  label,
  value,
  tone = "default",
  delta,
  deltaGood = "up",
  hint,
  className,
}: {
  label: string;
  value: number;
  tone?: "default" | "income" | "expense";
  delta?: number | null;
  deltaGood?: "up" | "down";
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border/25 bg-surface p-3.5 [container-type:inline-size]", className)}>
      <p className="text-xs font-medium text-muted">{label}</p>
      <div className="mt-2">
        {/* Fluid size: fills the card on wide layouts, shrinks to fit on narrow
            ones so long amounts (e.g. −₹22,571.33) never overflow. */}
        <Money
          paise={value}
          tone={tone}
          className="whitespace-nowrap font-bold tracking-tight text-[clamp(1rem,10.5cqi,1.55rem)]"
        />
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
        {delta !== undefined && <DeltaBadge delta={delta} good={deltaGood} />}
        {hint && <span className="text-2xs text-muted">{hint}</span>}
      </div>
    </div>
  );
}

export function DeltaBadge({ delta, good = "up" }: { delta: number | null; good?: "up" | "down" }) {
  if (delta === null) {
    return <span className="text-2xs text-muted">New</span>;
  }
  if (Math.abs(delta) < 0.05) {
    return <span className="text-2xs text-muted">No change</span>;
  }
  const up = delta > 0;
  const positive = good === "up" ? up : !up;
  return (
    <span
      className={cn(
        "inline-flex flex-wrap items-center gap-x-0.5 text-2xs font-medium",
        positive ? "text-income" : "text-expense",
      )}
    >
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {formatDelta(delta)}
      <span className="ml-0.5 font-normal text-muted">vs last month</span>
    </span>
  );
}
