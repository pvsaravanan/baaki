import { cn } from "@/lib/cn";

/** The soft cards of the Reports pages: rounded, lightly outlined, with plain-case headings. */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("overflow-hidden rounded-xl border border-border/25 bg-surface", className)} {...props} />;
}

export function CardHeader({ title, subtitle }: { title: React.ReactNode; subtitle?: React.ReactNode }) {
  return (
    <div className="px-4 pt-3.5">
      <h3 className="text-base font-bold text-fg">{title}</h3>
      {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
    </div>
  );
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4", className)} {...props} />;
}
