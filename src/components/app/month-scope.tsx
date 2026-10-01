"use client";
import { createContext, useCallback, useContext, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

/**
 * Smooth month switching for pages driven by `?m=YYYY-MM`.
 *
 * Switching months changes `?m=` and loads that month's data from the
 * device. The current month stays on screen (dimmed) while the next loads —
 * the screen passes `loading` while it's still showing the previous month —
 * the switcher's label updates at once, and the new month fades up in place.
 * Deliberately no movement: sliding the content sideways read as the page
 * shaking.
 */
interface MonthScopeValue {
  pending: boolean;
  /** The month being navigated to, shown by the switcher before it arrives. */
  targetKey: string | null;
  navigate: (href: string, monthKey: string) => void;
}

const MonthScopeContext = createContext<MonthScopeValue | null>(null);

export function useMonthScope() {
  return useContext(MonthScopeContext);
}

export function MonthScope({
  monthKey,
  loading = false,
  children,
}: {
  monthKey: string;
  /** The screen is still showing the previous month's data. */
  loading?: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [navigating, startTransition] = useTransition();
  const pending = navigating || loading;
  const [target, setTarget] = useState<string | null>(null);

  const navigate = useCallback(
    (href: string, key: string) => {
      setTarget(key);
      // scroll: false — it's the same page; stay where the reader is.
      startTransition(() => router.push(href, { scroll: false }));
    },
    [router],
  );

  // The label only needs the override while that month is on its way.
  const targetKey = pending && target !== monthKey ? target : null;

  return (
    <MonthScopeContext.Provider value={{ pending, targetKey, navigate }}>{children}</MonthScopeContext.Provider>
  );
}

/**
 * The part of the page that belongs to the month: dims while the next month
 * loads, then fades back up (a plain opacity transition — nothing moves).
 */
export function MonthContent({ children, className }: { children: React.ReactNode; className?: string }) {
  const scope = useContext(MonthScopeContext);
  return (
    <div
      aria-busy={scope?.pending || undefined}
      className={cn(
        "transition-opacity duration-300 ease-out motion-reduce:transition-none",
        scope?.pending && "pointer-events-none opacity-60",
        className,
      )}
    >
      {children}
    </div>
  );
}
