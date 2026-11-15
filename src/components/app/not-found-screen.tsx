"use client";
import Link from "next/link";
import { EmptyState } from "@/components/ui/misc";

/** Shown when a detail screen's `?id=` doesn't match anything (e.g. it was deleted). */
export function NotFoundScreen({ what, backHref }: { what: string; backHref: string }) {
  return (
    <EmptyState
      title={`This ${what} no longer exists`}
      description="It may have been deleted."
      action={
        <Link href={backHref} className="text-sm font-medium text-brand-hover hover:underline">
          Go back
        </Link>
      }
    />
  );
}
