"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Settings } from "lucide-react";
import { useAppData } from "./app-data";
import { UserAvatar } from "./user-avatar";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";

export function UserMenu() {
  const { user } = useAppData();
  const router = useRouter();
  const { error: toastError } = useToast();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function logout() {
    // Only navigate once Supabase has actually cleared the session.
    setSigningOut(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      setSigningOut(false);
      toastError(error.message || "Could not sign out");
      return;
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-none p-1 pr-2 transition-colors hover:bg-surface-2"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <UserAvatar url={user.avatarUrl} className="h-7 w-7" />
        <span className="hidden max-w-[120px] truncate text-sm font-medium text-fg sm:block">{user.name}</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 w-56 origin-top-right rounded-none border border-border bg-surface p-1 shadow-pop animate-scale-in"
        >
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium text-fg">{user.name}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <div className="my-1 h-px bg-border" />
          <Link
            href="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2 rounded-none px-3 py-2 text-sm text-fg transition-colors hover:bg-surface-2"
          >
            <Settings className="h-4 w-4 text-muted" />
            Settings
          </Link>
          <div className="my-1 h-px bg-border" />
          <button
            role="menuitem"
            onClick={logout}
            disabled={signingOut}
            className="flex w-full items-center gap-2 rounded-none px-3 py-2 text-sm text-fg transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogOut className="h-4 w-4 text-muted" />
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}
