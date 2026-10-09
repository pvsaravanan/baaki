"use client";
import { AVATARS, type AvatarId } from "@/lib/avatars";
import { cn } from "@/lib/cn";
import { AvatarPicture } from "./user-avatar";

/**
 * The chosen picture large, over a grid of every picture to choose from. Used
 * when setting up the app and in Settings.
 */
export function AvatarPicker({
  value,
  onChange,
  className,
}: {
  value: AvatarId;
  onChange: (id: AvatarId) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center", className)}>
      <AvatarPicture id={value} className="h-[132px] w-[132px]" />
      <div role="radiogroup" aria-label="Profile picture" className="mt-6 grid w-full grid-cols-5 justify-items-center gap-x-2 gap-y-3">
        {AVATARS.map((a) => {
          const selected = a.id === value;
          return (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={a.label}
              onClick={() => onChange(a.id)}
              className={cn(
                // Focus is an outline, so it shows alongside the selection ring rather than replacing it.
                "rounded-full p-[3px] transition-shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                selected ? "ring-[2.5px] ring-brand-hover" : "ring-0",
              )}
            >
              <AvatarPicture id={a.id} className="h-14 w-14" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
