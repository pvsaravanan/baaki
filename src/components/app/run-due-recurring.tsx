"use client";
import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { apiPost } from "@/lib/http";
import { useAppData } from "./app-data";

/**
 * Posts any due auto-post recurring rules when the app opens, and again each
 * time it comes back to the foreground (a phone app can stay open for days),
 * then refreshes so balances reflect them.
 */
export function RunDueRecurring() {
  const { refresh } = useAppData();

  useEffect(() => {
    const run = () =>
      apiPost<{ posted: number }>("/api/recurring/run-due")
        .then((res) => {
          if (res?.posted > 0) refresh();
        })
        .catch(() => {
          /* non-critical: the user can still add transactions manually */
        });
    run();

    if (!Capacitor.isNativePlatform()) return;
    let removed = false;
    let remove: (() => void) | undefined;
    import("@capacitor/app").then(({ App }) =>
      App.addListener("resume", run).then((handle) => {
        remove = () => handle.remove();
        if (removed) remove();
      }),
    );
    return () => {
      removed = true;
      remove?.();
    };
  }, [refresh]);

  return null;
}
