"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { DEFAULT_AVATAR, type AvatarId } from "@/lib/avatars";
import { ApiError, apiPatch } from "@/lib/http";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { AvatarGrid } from "./avatar-picker";
import { AvatarPicture } from "./user-avatar";

/**
 * After the onboarding slides: pick a profile picture. Continue saves it;
 * Skip leaves the generic silhouette (it can be chosen later in Settings).
 */
export function ChooseAvatarScreen({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const [avatar, setAvatar] = useState<AvatarId>(DEFAULT_AVATAR);
  const [saving, setSaving] = useState(false);
  const { error } = useToast();

  // Whether more pictures sit above or below the visible part of the grid, for
  // the fades that say so (Android shows no scrollbar until you scroll).
  // Measured from the ResizeObserver, which first reports right after the
  // browser's own layout; measuring as the page mounts would force a layout of
  // the whole new page early, a visible stall as it appears.
  const listRef = useRef<HTMLDivElement>(null);
  const [moreAbove, setMoreAbove] = useState(false);
  const [moreBelow, setMoreBelow] = useState(false);
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const update = () => {
      setMoreAbove(list.scrollTop > 4);
      setMoreBelow(list.scrollTop + list.clientHeight < list.scrollHeight - 4);
    };
    list.addEventListener("scroll", update, { passive: true });
    const resized = new ResizeObserver(update);
    resized.observe(list);
    return () => {
      list.removeEventListener("scroll", update);
      resized.disconnect();
    };
  }, []);

  async function save() {
    setSaving(true);
    try {
      await apiPatch("/api/user", { avatar });
      onDone();
    } catch (err) {
      error(err instanceof ApiError ? err.message : "Couldn't save your picture. Try again, or skip for now.");
      setSaving(false);
    }
  }

  return (
    <main className="flex h-dvh flex-col bg-bg pb-[max(env(safe-area-inset-bottom),24px)] pt-[env(safe-area-inset-top)]">
      <div className="flex h-14 shrink-0 items-center justify-between px-4">
        <button
          type="button"
          aria-label="Back"
          onClick={onBack}
          className="flex h-11 w-11 items-center justify-center text-fg"
        >
          <ArrowLeft aria-hidden className="h-6 w-6" strokeWidth={2} />
        </button>
        <button type="button" onClick={onDone} className="h-11 px-3 text-[15px] text-muted hover:text-fg">
          Skip
        </button>
      </div>

      {/* The heading and the chosen picture stay put; only the grid scrolls.
          Phone-width on a desktop. */}
      <div className="mx-auto flex min-h-0 w-full max-w-[440px] flex-1 flex-col px-6 animate-enter">
        <h1 className="mt-2 shrink-0 text-center text-[28px] font-bold leading-[38px] text-fg">
          Choose a
          <br />
          profile picture
        </h1>
        <p className="mx-auto mt-3 max-w-[300px] shrink-0 text-center text-[14px] leading-[24px] text-muted">
          Add a profile picture to personalize your baaki experience.
        </p>
        <AvatarPicture id={avatar} className="mx-auto mt-5 h-[132px] w-[132px]" eager />

        <div className="relative mt-5 min-h-0 flex-1">
          <div ref={listRef} className="h-full overflow-y-auto pb-4">
            <AvatarGrid value={avatar} onChange={setAvatar} />
          </div>
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-bg to-transparent transition-opacity duration-200",
              moreAbove ? "opacity-100" : "opacity-0",
            )}
          />
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-bg to-transparent transition-opacity duration-200",
              moreBelow ? "opacity-100" : "opacity-0",
            )}
          />
        </div>
      </div>

      <div className="mx-auto w-full max-w-[440px] shrink-0 px-6 pt-3">
        <Button size="lg" className="w-full" onClick={save} loading={saving}>
          Continue
          <ArrowRight aria-hidden className="h-5 w-5" strokeWidth={2.5} />
        </Button>
      </div>
    </main>
  );
}
