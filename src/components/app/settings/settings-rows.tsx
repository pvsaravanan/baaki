import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

/** A headed group of rows in one outlined card. */
export function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title}>
      <h2 className="mb-1.5 px-1 text-body-sm font-bold text-muted">{title}</h2>
      <ul className="rounded-xl border border-border/25">{children}</ul>
    </section>
  );
}

const ROW = "flex min-h-[52px] w-full items-center gap-3 px-3.5 py-2 text-left";

function RowBody({ icon, label, value, chevron }: { icon: React.ReactNode; label: string; value?: React.ReactNode; chevron: boolean }) {
  return (
    <>
      <span aria-hidden className="flex w-6 shrink-0 justify-center text-fg [&>svg]:h-[22px] [&>svg]:w-[22px]">{icon}</span>
      {/* The rule runs under the text, not the icon, as far as the row's end. */}
      <span className="min-w-0 flex-1 text-body-sm font-medium text-fg">{label}</span>
      {value !== undefined && <span className="min-w-0 shrink text-right text-xs text-muted">{value}</span>}
      {chevron && <ChevronRight aria-hidden className="h-5 w-5 shrink-0 text-fg" />}
    </>
  );
}

const ITEM = "[&:not(:last-child)]:border-b [&:not(:last-child)]:border-border/10";

/** A row that opens something: a page with `href`, or anything else with `onClick`. */
export function NavRow({
  icon,
  label,
  value,
  href,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value?: React.ReactNode;
  href?: string;
  onClick?: () => void;
}) {
  const body = <RowBody icon={icon} label={label} value={value} chevron />;
  const cls = cn(ROW, "transition-colors hover:bg-brand-soft/20 active:bg-brand-soft/30");
  return (
    <li className={ITEM}>
      {href ? (
        <Link href={href} className={cls}>{body}</Link>
      ) : (
        <button type="button" onClick={onClick} className={cls}>{body}</button>
      )}
    </li>
  );
}

/** A plain fact about the app: nothing to change, so no chevron and no tap. */
export function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <li className={cn(ROW, ITEM)}>
      <RowBody icon={icon} label={label} value={value} chevron={false} />
    </li>
  );
}
