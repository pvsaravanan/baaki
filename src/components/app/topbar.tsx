"use client";
import Image from "next/image";
import Link from "next/link";
import logo from "@/assets/baaki_logo_mark_with_background.png";
import { UserMenu } from "./user-menu";
import { TopbarSlotTarget } from "./topbar-slot";

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 flex h-[calc(4rem+env(safe-area-inset-top,0px))] items-center justify-between border-border bg-bg/95 md:border-b backdrop-blur-sm px-4 pt-[env(safe-area-inset-top,0px)] sm:px-6">
      <div className="md:hidden">
        <Link href="/dashboard" aria-label="baaki home">
          <Image src={logo} alt="" width={48} height={48} priority className="h-12 w-12" />
        </Link>
      </div>
      {/* Filled by the screen (the month picker); empty otherwise. */}
      <TopbarSlotTarget className="flex min-w-0 flex-1 justify-center px-1" />
      <div className="flex items-center gap-2 sm:gap-3">
        <UserMenu />
      </div>
    </header>
  );
}
