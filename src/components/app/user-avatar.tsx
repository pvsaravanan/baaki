import { UserRound } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * The user's profile photo, or a generic person silhouette when they haven't
 * uploaded one. `className` sets the size (e.g. "h-7 w-7").
 */
export function UserAvatar({ url, className }: { url: string | null; className?: string }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className={cn("shrink-0 rounded-full border border-border object-cover", className)} />;
  }
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-end justify-center overflow-hidden rounded-full border border-border bg-surface-2 text-muted",
        className,
      )}
    >
      {/* Sized to the circle and nudged down so the shoulders meet its edge. */}
      <UserRound className="h-[82%] w-[82%] translate-y-[8%]" strokeWidth={1.75} />
    </span>
  );
}
