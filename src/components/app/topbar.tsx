"use client";
import { cn } from "@/lib/cn";
import { UserMenu } from "./user-menu";
import { TopbarSlotTarget, useBannerActive } from "./topbar-slot";

export function Topbar() {
  // A screen with its own banner (see PageBanner) stands in for this bar on a phone.
  const banner = useBannerActive();
  return (
    <>
      {/* Keeps the status bar's area solid while the page scrolls under it. */}
      {banner && <div aria-hidden className="sticky top-0 z-30 h-[env(safe-area-inset-top,0px)] bg-bg md:hidden" />}
      <header
        className={cn(
          "sticky top-0 z-30 grid h-[calc(4rem+env(safe-area-inset-top,0px))] grid-cols-[1fr_auto_1fr] items-center border-border bg-bg/95 md:border-b backdrop-blur-sm px-4 pt-[env(safe-area-inset-top,0px)] sm:px-6",
          banner && "max-md:hidden",
        )}
      >
        <div aria-hidden />
        {/* Filled by the screen (the month picker); empty otherwise. Kept in the
            middle column so it stays centred whatever sits at the edges. */}
        <TopbarSlotTarget className="flex min-w-0 justify-center px-1" />
        <div className="flex items-center justify-self-end gap-2 sm:gap-3">
          <UserMenu />
        </div>
      </header>
    </>
  );
}
