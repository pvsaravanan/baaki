"use client";
import { AppDataProvider, type AppData } from "./app-data";
import { TransactionModalProvider } from "./add-transaction";
import { SidebarProvider } from "./sidebar-context";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { BottomNav } from "./bottom-nav";
import { RunDueRecurring } from "./run-due-recurring";
import { PageTransition } from "./page-transition";
import { useState } from "react";
import { eraseLocalData, usePageData } from "@/lib/local-api";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Logo } from "@/components/logo";
import { LockGate } from "./lock-gate";
import { NativeApp } from "./native-app";

/**
 * The app frame. Loads what every screen shares (accounts, categories,
 * preferences…) from the on-device database; until the first load finishes —
 * a moment on start-up while the database opens — it shows the logo.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { data, error, mutate } = usePageData("shell");
  return (
    <>
      {data || error ? <NativeApp /> : null}
      {data ? (
        <LockGate enabled={data.preference.appLock}>
          <AppFrame data={data}>{children}</AppFrame>
        </LockGate>
      ) : error ? (
        <RecoveryScreen error={error} onRetry={() => mutate()} />
      ) : (
        <div className="flex h-dvh items-center justify-center bg-bg">
          <Logo size="h-12 w-9" />
        </div>
      )}
    </>
  );
}

/**
 * Shown when the database can't be opened. Offers a retry, and — since
 * relaunching can't repair damaged data — a way to start over, after which a
 * backup file can be restored from Settings.
 */
function RecoveryScreen({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const confirm = useConfirm();
  const [erasing, setErasing] = useState(false);

  async function startOver() {
    const ok = await confirm({
      title: "Erase baaki's data on this phone?",
      message:
        "Everything stored in baaki on this phone will be deleted and the app will start fresh. If you have a backup file, restore it afterwards from Settings → Data & backup.",
      confirmLabel: "Erase and start fresh",
      danger: true,
    });
    if (!ok) return;
    setErasing(true);
    try {
      await eraseLocalData();
    } finally {
      window.location.replace("/");
    }
  }

  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-5 bg-bg px-6 text-center">
      <Logo size="h-12 w-9" />
      <div className="max-w-sm space-y-2">
        <p className="text-body-md font-bold text-fg">baaki couldn&apos;t open its data</p>
        <p className="text-sm text-muted">
          Try again first. If it keeps failing, the data on this phone is damaged: erase it to start fresh, then restore
          your latest backup file from Settings.
        </p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-2">
        <Button onClick={onRetry} disabled={erasing}>
          Try again
        </Button>
        <Button variant="outline" onClick={startOver} loading={erasing}>
          Erase and start fresh
        </Button>
      </div>
      <p className="max-w-sm break-words text-2xs text-faint">Details: {error.message}</p>
    </div>
  );
}

function AppFrame({ data, children }: { data: Omit<AppData, "refresh">; children: React.ReactNode }) {
  return (
    <AppDataProvider value={data}>
      <TransactionModalProvider>
        <SidebarProvider>
          <RunDueRecurring />
          {/* h-dvh, not h-screen: on phones 100vh is the height with the browser's
              toolbars hidden, so an h-screen frame is taller than what's visible —
              the whole page scrolls (dragging the top bar with it) and the end of
              each page hides under the bottom bar. dvh tracks the visible area. */}
          <div className="flex h-dvh overflow-hidden">
            <Sidebar />
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
              <Topbar />
              {/* Stable scrollbar gutter: a page whose height changes (e.g. switching
                  months) must not shift sideways as a scrollbar comes and goes. */}
              <main className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 pb-[calc(7rem+env(safe-area-inset-bottom,0px))] pt-5 [scrollbar-gutter:stable] sm:px-6 md:pb-8 lg:px-8">
                <div className="mx-auto w-full min-w-0 max-w-6xl">
                  <PageTransition>{children}</PageTransition>
                </div>
              </main>
            </div>
          </div>
          <BottomNav />
        </SidebarProvider>
      </TransactionModalProvider>
    </AppDataProvider>
  );
}
