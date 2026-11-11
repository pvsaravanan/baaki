import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Money } from "@/components/money";
import { formatPercent } from "@/lib/money";

export interface CategorySlice {
  name: string;
  value: number;
  color: string;
}

const OTHERS_COLOR = "#d6d3cb";
const SHOWN = 3;

/** The biggest categories as they are, and everything else as one "Others" slice. */
export function topSlicesWithOthers(categories: CategorySlice[]): CategorySlice[] {
  const positive = categories.filter((c) => c.value > 0);
  const top = positive.slice(0, SHOWN);
  const rest = positive.slice(SHOWN).reduce((sum, c) => sum + c.value, 0);
  return rest > 0 ? [...top, { name: "Others", value: rest, color: OTHERS_COLOR }] : top;
}

const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** A ring with one arc per slice and the total in the middle. */
function Ring({ slices, total }: { slices: CategorySlice[]; total: number }) {
  const gap = slices.length > 1 ? 3 : 0;
  let offset = 0;
  return (
    <div className="relative h-[clamp(80px,12.5dvh,128px)] w-[clamp(80px,12.5dvh,128px)] shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={RADIUS} fill="none" strokeWidth="13" className="stroke-surface-2" />
        {slices.map((s) => {
          const length = (s.value / total) * CIRCUMFERENCE;
          const arc = (
            <circle
              key={s.name}
              cx="50"
              cy="50"
              r={RADIUS}
              fill="none"
              strokeWidth="13"
              stroke={s.color}
              strokeDasharray={`${Math.max(length - gap, 0.5)} ${CIRCUMFERENCE}`}
              strokeDashoffset={-offset}
            />
          );
          offset += length;
          return arc;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Money paise={total} tone="default" decimals="never" className="text-[12px] font-bold leading-4 md:text-[15px]" />
        <span className="text-[11px] leading-4 text-fg md:text-body-sm">Total</span>
      </div>
    </div>
  );
}

export function SpendingCategoryCard({ categories, total }: { categories: CategorySlice[]; total: number }) {
  const slices = topSlicesWithOthers(categories);
  return (
    <div className="shrink-0 rounded-xl border border-border bg-surface p-3 md:p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-label-md uppercase tracking-[0.06em] text-fg md:text-label-lg">Spending by category</h3>
        <Link href="/reports" className="flex shrink-0 items-center gap-1 text-label-sm uppercase text-brand-hover">
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      {slices.length === 0 || total <= 0 ? (
        <p className="py-4 text-center text-[12px] text-muted md:py-8 md:text-body-sm">No spending yet. Categories appear as you spend.</p>
      ) : (
        <div className="mt-2 flex items-center gap-4 md:mt-4">
          <Ring slices={slices} total={total} />
          {/* Plain flex rows, not a subgrid: older Android WebViews don't support
              subgrid, and the rows then fall apart into stacked lines. */}
          <ul className="flex min-w-0 flex-1 flex-col gap-y-2 text-[12px] md:gap-y-3 md:text-body-sm">
            {slices.map((s) => (
              <li key={s.name} className="flex items-center gap-2.5">
                <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: s.color }} />
                <span className="min-w-0 flex-1 truncate text-fg">{s.name}</span>
                <span className="shrink-0 text-fg">{formatPercent((s.value / total) * 100)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
