"use client";
import Link from "next/link";
import { cn } from "@/lib/cn";

/** The rows of one settings panel, in an outlined card. The panel's header carries the visible title. */
export function Section({
  id, title, description, aside, children,
}: {
  id: string;
  title: string;
  description?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-label={title}>
      {(description || aside) && (
        <div className="mb-3 flex items-end justify-between gap-3">
          {description && <p className="min-w-0 text-body-sm text-muted">{description}</p>}
          {aside && <div className="shrink-0">{aside}</div>}
        </div>
      )}
      <div className="divide-y divide-border/15 overflow-hidden rounded-xl border border-border/25">{children}</div>
    </section>
  );
}

/** One setting: label and help on the left, its control on the right (or below, when `stacked`). */
export function Row({
  title, description, htmlFor, stacked, children,
}: {
  title: string;
  description?: string;
  htmlFor?: string;
  stacked?: boolean;
  children: React.ReactNode;
}) {
  const Label = htmlFor ? "label" : "p";
  return (
    <div
      className={cn(
        "flex flex-col gap-3 p-4",
        !stacked && "sm:flex-row sm:items-center sm:justify-between sm:gap-6",
      )}
    >
      <div className="min-w-0">
        <Label htmlFor={htmlFor} className="block text-body-sm font-bold text-fg">{title}</Label>
        {description && <p className="mt-0.5 text-body-sm text-muted">{description}</p>}
      </div>
      <div className={cn("min-w-0", !stacked && "sm:shrink-0")}>{children}</div>
    </div>
  );
}

/** A full-width tappable row that runs an action or links somewhere. */
export function ActionRow({
  icon, title, description, trailing, onClick, href, busy,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  trailing: React.ReactNode;
  onClick?: () => void;
  href?: string;
  busy?: boolean;
}) {
  const inner = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center text-fg">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-body-sm font-bold text-fg">{busy ? `${title} — preparing…` : title}</span>
        <span className="mt-0.5 block text-body-sm text-muted">{description}</span>
      </span>
      <span className="shrink-0 text-muted transition-colors group-hover:text-fg">{trailing}</span>
    </>
  );
  const cls =
    "group flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-surface-2 focus:outline-none focus-visible:bg-surface-2 disabled:cursor-wait disabled:opacity-60";
  return href ? (
    <Link href={href} className={cls}>{inner}</Link>
  ) : (
    <button type="button" onClick={onClick} disabled={busy} className={cls}>{inner}</button>
  );
}
