import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Money } from "@/components/money";
import { formatDelta } from "@/lib/money";
import { cn } from "@/lib/cn";

/** The big card: what you hold across every account. */
export function BalanceHero({ balance }: { balance: number }) {
  return (
    <div className="shrink-0 rounded-xl border border-border bg-brand-soft p-3 [container-type:inline-size] md:p-5">
      <div className="min-w-0">
        <p className="text-[12px] leading-4 text-muted md:text-body-md">Total balance</p>
        <Money paise={balance} tone="default" className="block whitespace-nowrap text-[clamp(1.35rem,7cqi,2.1rem)] font-bold leading-tight tracking-tight" />
        <p className="text-[12px] leading-4 text-muted md:mt-1 md:text-body-sm [@media(max-height:740px)_and_(max-width:767px)]:hidden">across all accounts</p>
      </div>
    </div>
  );
}

/** Income, expenses or savings: a rounded card with the amount and how it moved since last month. */
export function SummaryTile({
  label,
  value,
  tone,
  delta,
  deltaGood,
}: {
  label: string;
  value: number;
  tone: "income" | "expense";
  delta: number | null;
  deltaGood: "up" | "down";
}) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-surface p-2.5 shadow-stamp-sm [container-type:inline-size] md:p-3">
      <p className="truncate text-[12px] font-medium leading-4 text-fg md:text-body-sm">{label}</p>
      <Money
        paise={value}
        tone={tone}
        decimals="never"
        className="mt-1 block whitespace-nowrap text-[clamp(0.85rem,11cqi,1.5rem)] font-bold leading-tight tracking-tight"
      />
      <TileDelta delta={delta} good={deltaGood} />
    </div>
  );
}

function TileDelta({ delta, good }: { delta: number | null; good: "up" | "down" }) {
  if (delta === null) return <p className="mt-1 text-[10px] uppercase leading-4 text-faint">New</p>;
  if (Math.abs(delta) < 0.05) return <p className="mt-1 text-[10px] uppercase leading-4 text-faint">No change</p>;
  const up = delta > 0;
  const positive = good === "up" ? up : !up;
  return (
    <p className={cn("mt-1 flex items-center gap-0.5 text-[11px] font-medium leading-4 md:text-body-sm", positive ? "text-income" : "text-expense")}>
      {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
      {formatDelta(delta)}
    </p>
  );
}
