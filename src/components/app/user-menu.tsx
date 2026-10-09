"use client";
import Link from "next/link";
import { readAvatar } from "@/lib/avatars";
import { useAppData } from "./app-data";
import { CHOOSE_PICTURE_HREF, usePictureNudgeSeen } from "./picture-nudge";
import { UserAvatar } from "./user-avatar";

/**
 * Your picture and name in the top bar; opens Settings (there's no signing out
 * on the device). Without a picture it nudges toward choosing one, with a dot
 * (and a line under the name where there's room), and opens the picker.
 */
export function UserMenu() {
  const { user } = useAppData();
  const nudgeSeen = usePictureNudgeSeen();
  const nudge = readAvatar(user.avatarUrl).kind === "none" && !nudgeSeen;
  return (
    <Link
      href={nudge ? CHOOSE_PICTURE_HREF : "/settings"}
      aria-label={nudge ? "Settings: choose a profile picture" : "Settings"}
      className="flex items-center gap-2 rounded-none p-1 pr-2 transition-colors hover:bg-surface-2"
    >
      <span className="relative shrink-0">
        <UserAvatar url={user.avatarUrl} className="h-7 w-7" />
        {nudge && (
          <span aria-hidden className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-brand-hover ring-2 ring-bg" />
        )}
      </span>
      <span className="hidden max-w-[120px] sm:block">
        <span className="block truncate text-sm font-medium text-fg">{user.name}</span>
        {nudge && <span className="block truncate text-xs text-accent">Choose a picture</span>}
      </span>
    </Link>
  );
}
