import Image, { type StaticImageData } from "next/image";
import dart from "@/assets/default/dart.png";
import bank from "@/assets/default/bank.png";
import categories from "@/assets/default/categories.png";
import boy from "@/assets/default/boy.png";
import calendar from "@/assets/default/calendar.png";
import budget from "@/assets/default/budget.png";
import transferMoney from "@/assets/default/transfer-money.png";
import insights from "@/assets/default/insights.png";
import trend from "@/assets/default/trend.png";
import report from "@/assets/default/report.png";
import { cn } from "@/lib/cn";

/**
 * Illustrated icons for the app's sections, shown only on a section's own
 * page when it has nothing in it yet (its empty state). Navigation keeps the
 * plain line icons.
 */
export const SECTION_ICONS = {
  goals: dart,
  accounts: bank,
  categories,
  people: boy,
  recurring: calendar,
  budgets: budget,
  transactions: transferMoney,
  insights,
  trends: trend,
  reports: report,
} satisfies Record<string, StaticImageData>;

export type SectionIconKey = keyof typeof SECTION_ICONS;

/**
 * A section's illustration. Like category icons, its dark outlines get a
 * hairline light halo on the dark theme so they stay legible.
 */
export function SectionIcon({ section, size = 20, className }: { section: SectionIconKey; size?: number; className?: string }) {
  return (
    <Image
      src={SECTION_ICONS[section]}
      alt=""
      width={size}
      height={size}
      draggable={false}
      className={cn(
        "shrink-0 select-none object-contain dark:[filter:drop-shadow(0_0_0.6px_#f4f1ea)_drop-shadow(0_0_0.6px_#f4f1ea)]",
        className,
      )}
      style={{ width: size, height: size }}
    />
  );
}
