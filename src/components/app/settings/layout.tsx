"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

/** A titled group of settings: heading above, rows inside one outlined card. */
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
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-4">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 id={`${id}-title`} className="text-label-lg uppercase tracking-[0.06em] text-fg">{title}</h2>
          {description && <p className="mt-1 text-body-sm text-muted">{description}</p>}
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </div>
      <div className="divide-y divide-border rounded-md border border-border bg-surface shadow-card">{children}</div>
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
        "flex flex-col gap-3 p-5",
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
    "group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-surface-2 focus:outline-none focus-visible:bg-surface-2 disabled:cursor-wait disabled:opacity-60";
  return href ? (
    <Link href={href} className={cls}>{inner}</Link>
  ) : (
    <button type="button" onClick={onClick} disabled={busy} className={cls}>{inner}</button>
  );
}

/**
 * The section being read, for the index: the last one whose top has passed
 * the upper third of the scroll area — or the last section once scrolled to
 * the bottom, since a short final section may never reach that line.
 */
export function useActiveSection(ids: readonly string[]) {
  const [active, setActive] = useState<string>(ids[0]);
  const key = ids.join(",");
  useEffect(() => {
    const first = document.getElementById(ids[0]);
    const scroller = first?.closest("main");
    if (!scroller) return;
    const update = () => {
      const top = scroller.getBoundingClientRect().top;
      const line = top + scroller.clientHeight / 3;
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }
      const scrollable = scroller.scrollHeight > scroller.clientHeight + 4;
      if (scrollable && scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 4) {
        current = ids[ids.length - 1];
      }
      setActive(current);
    };
    update();
    scroller.addEventListener("scroll", update, { passive: true });
    return () => scroller.removeEventListener("scroll", update);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return active;
}
