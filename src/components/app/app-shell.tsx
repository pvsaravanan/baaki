"use client";
import { AppDataProvider, type AppData } from "./app-data";
import { TransactionModalProvider } from "./add-transaction";
import { SidebarProvider } from "./sidebar-context";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { TopbarSlotProvider } from "./topbar-slot";
import { BottomNav } from "./bottom-nav";
import { RunDueRecurring } from "./run-due-recurring";
import { KeepWindowPinned } from "./keep-window-pinned";
import { PageTransition } from "./page-transition";
import { Capacitor } from "@capacitor/core";
import { usePageData } from "@/lib/request/local-api";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { LockGate } from "./lock-gate";
import { NativeApp } from "./native-app";
import { AppTour } from "./app-tour/app-tour";

/**
 * The app frame. Loads what every screen shares (accounts, categories,
 * preferences…) from the server; until the first load finishes it shows the logo.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { data, error, mutate, fromCache } = usePageData("shell");
  return (
    <>
      {/* Mounted straight away, so the launch animation plays while the data
          loads; it leaves once the data (or the recovery screen) is ready. */}
      <NativeApp ready={Boolean(data || error)} />
      {/* A saved copy from the last launch is only a stand-in: if the database
          then fails to open, recovery is what's needed, not stale numbers. */}
      {data && !(error && fromCache) ? (
        <LockGate enabled={data.preference.appLock && Capacitor.isNativePlatform()} fresh={!fromCache}>
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

/** Shown when the app's data can't be loaded: try again, or sign in afresh. */
function RecoveryScreen({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-5 bg-bg px-6 text-center">
      <Logo size="h-12 w-9" />
      <div className="max-w-sm space-y-2">
        <p className="text-body-md font-bold text-fg">baaki couldn&apos;t load your data</p>
        <p className="text-sm text-muted">Check your connection and try again. Your data hasn&apos;t been touched.</p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-2">
        <Button onClick={onRetry}>Try again</Button>
        <Button variant="outline" onClick={() => window.location.assign("/login")}>
          Sign in again
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
          <KeepWindowPinned />
          <AppTour />
          {/* h-dvh, not h-screen: on phones 100vh is the height with the browser's
              toolbars hidden, so an h-screen frame is taller than what's visible —
              the whole page scrolls (dragging the top bar with it) and the end of
              each page hides under the bottom bar. dvh tracks the visible area. */}
          <div className="flex h-dvh overflow-hidden">
            <Sidebar />
            <TopbarSlotProvider>
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
              <Topbar />
              {/* Stable scrollbar gutter: a page whose height changes (e.g. switching
                  months) must not shift sideways as a scrollbar comes and goes. */}
              <main className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] pt-5 [scrollbar-gutter:stable] sm:px-6 md:pb-8 lg:px-8">
                <div className="mx-auto w-full min-w-0 max-w-6xl">
                  <PageTransition>{children}</PageTransition>
                </div>
              </main>
            </div>
            </TopbarSlotProvider>
          </div>
          <BottomNav />
        </SidebarProvider>
      </TransactionModalProvider>
    </AppDataProvider>
  );
}
