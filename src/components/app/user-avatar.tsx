import Image from "next/image";
import { UserRound } from "lucide-react";
import { readAvatar, type AvatarId } from "@/lib/avatars";
import { cn } from "@/lib/cn";
import { AVATAR_IMAGES } from "./avatar-assets";

/** One of the profile pictures, filling its circle. `className` sets the size. */
export function AvatarPicture({ id, className }: { id: AvatarId; className?: string }) {
  return (
    <Image
      src={AVATAR_IMAGES[id]}
      alt=""
      draggable={false}
      className={cn("shrink-0 select-none rounded-full object-cover", className)}
    />
  );
}

/**
 * The user's profile picture, a photo uploaded before pictures replaced
 * uploads, or a generic person silhouette. `className` sets the size (e.g.
 * "h-7 w-7").
 */
export function UserAvatar({ url, className }: { url: string | null; className?: string }) {
  const avatar = readAvatar(url);
  if (avatar.kind === "picture") return <AvatarPicture id={avatar.id} className={className} />;
  if (avatar.kind === "photo") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatar.src} alt="" className={cn("shrink-0 rounded-full border border-border object-cover", className)} />;
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
