"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftRight, LayoutDashboard, MoreHorizontal, PieChart, Plus } from "lucide-react";
import { Sheet } from "./sheet";
import { MORE_SHEET_GROUPS } from "./nav-items";
import { useTransactionModal } from "./add-transaction";
import { cn } from "@/lib/cn";
import { TOUR_MENU_EVENT } from "./app-tour";

const TABS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/reports", label: "Reports", icon: PieChart },
];

export function BottomNav() {
  const pathname = usePathname();
  const { openAdd } = useTransactionModal();
  const [moreOpen, setMoreOpen] = useState(false);

  // The app tour opens this menu to point at what's inside it.
  useEffect(() => {
    const onTour = (e: Event) => setMoreOpen(Boolean((e as CustomEvent<{ open: boolean }>).detail?.open));
    window.addEventListener(TOUR_MENU_EVENT, onTour);
    return () => window.removeEventListener(TOUR_MENU_EVENT, onTour);
  }, []);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-border bg-surface/95 backdrop-blur-md md:hidden print:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5 items-center px-2 pt-1 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
          <Tab {...TABS[0]} active={isActive(TABS[0].href)} />
          <Tab {...TABS[1]} active={isActive(TABS[1].href)} />
          <div className="flex justify-center">
            <button
              onClick={() => openAdd()}
              aria-label="Add transaction"
              data-tour="add"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-brand text-brand-fg transition-all active:translate-x-[3px] active:translate-y-[3px]"
            >
              <Plus className="h-6 w-6" strokeWidth={2.5} />
            </button>
          </div>
          <Tab {...TABS[2]} active={isActive(TABS[2].href)} />
          <button
            onClick={() => setMoreOpen(true)}
            data-tour="more"
            className={cn(
              "flex min-h-[44px] flex-col items-center justify-center gap-1 py-1.5 text-[10px] font-bold leading-[14px] tracking-[0.02em] active:opacity-70",
              moreOpen ? "text-brand-hover" : "text-fg",
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            More
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="Menu">
        <div className="space-y-5 pb-2">
          {MORE_SHEET_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-2 text-label-sm text-faint">{group.label}</p>
              <div data-tour="menu" className="grid grid-cols-3 gap-2">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-xl border border-border p-4 text-label-sm transition-all",
                        active ? "bg-brand text-brand-fg" : "text-muted hover:bg-brand-soft hover:text-secondary",
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Sheet>
    </>
  );
}

function Tab({ href, label, icon: Icon, active }: { href: string; label: string; icon: React.ElementType; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn("flex flex-col items-center gap-1 py-1.5 text-[10px] font-bold leading-[14px] tracking-[0.02em]", active ? "text-brand-hover" : "text-fg")}
    >
      <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
      {label}
    </Link>
  );
}
