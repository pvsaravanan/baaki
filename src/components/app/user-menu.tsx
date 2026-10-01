"use client";
import Link from "next/link";
import { useAppData } from "./app-data";
import { UserAvatar } from "./user-avatar";

/** Your photo and name in the top bar; opens Settings (there's no signing out on the device). */
export function UserMenu() {
  const { user } = useAppData();
  return (
    <Link
      href="/settings"
      aria-label="Settings"
      className="flex items-center gap-2 rounded-none p-1 pr-2 transition-colors hover:bg-surface-2"
    >
      <UserAvatar url={user.avatarUrl} className="h-7 w-7" />
      <span className="hidden max-w-[120px] truncate text-sm font-medium text-fg sm:block">{user.name}</span>
    </Link>
  );
}
