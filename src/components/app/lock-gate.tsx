"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Fingerprint } from "lucide-react";
import { lockAvailability, unlockWithDevice } from "@/lib/app-lock";
import { Logo, Wordmark } from "@/components/logo";
import { Button } from "@/components/ui/button";

/** Lock again when the app has been in the background at least this long. */
const RELOCK_AFTER_MS = 60_000;

/**
 * Covers the app until the person unlocks it, when the app lock is on
 * (Settings → Security): on opening, and on returning after a minute or more
 * away. Short trips out — sharing a backup, checking a message — don't lock.
 */
export function LockGate({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  const active = enabled && Capacitor.isNativePlatform();
  const [locked, setLocked] = useState(active);
  const [prompting, setPrompting] = useState(false);
  const hiddenAt = useRef<number | null>(null);

  const unlock = useCallback(async () => {
    setPrompting(true);
    const ok = await unlockWithDevice();
    setPrompting(false);
    if (ok) setLocked(false);
  }, []);

  // Turning the lock on in Settings shouldn't lock you out on the spot.
  useEffect(() => {
    if (!active) setLocked(false);
  }, [active]);

  // Ask straight away when the app opens locked — unless the phone has no
  // screen lock any more (or this is a restored backup on a phone without
  // one): then the lock could never be opened, so it stands aside.
  const asked = useRef(false);
  useEffect(() => {
    if (!locked || asked.current) return;
    asked.current = true;
    lockAvailability()
      .catch(() => ({ available: false }))
      .then(({ available }) => (available ? unlock() : setLocked(false)));
  }, [locked, unlock]);

  useEffect(() => {
    if (!active) return;
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    import("@capacitor/app").then(async ({ App }) => {
      const pause = await App.addListener("pause", () => {
        hiddenAt.current = Date.now();
      });
      const resume = await App.addListener("resume", () => {
        const away = hiddenAt.current === null ? 0 : Date.now() - hiddenAt.current;
        hiddenAt.current = null;
        if (away >= RELOCK_AFTER_MS) {
          lockAvailability()
            .catch(() => ({ available: false }))
            .then(({ available }) => {
              if (!available) return;
              setLocked(true);
              void unlock();
            });
        }
      });
      cleanup = () => {
        void pause.remove();
        void resume.remove();
      };
      if (cancelled) cleanup();
    });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [active, unlock]);

  if (!locked) return <>{children}</>;
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-8 bg-bg px-6 text-center">
      <div className="flex items-center gap-3">
        <Logo size="h-10 w-7" />
        <Wordmark className="h-7 text-fg" />
      </div>
      <p className="max-w-xs text-body-sm text-muted">baaki is locked. Use your fingerprint or screen lock to open it.</p>
      <Button onClick={unlock} loading={prompting}>
        <Fingerprint className="h-4 w-4" aria-hidden />
        Unlock
      </Button>
    </div>
  );
}
