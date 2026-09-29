"use client";
import { AppDataProvider, type AppData } from "./app-data";
import { TransactionModalProvider } from "./add-transaction";
import { SidebarProvider } from "./sidebar-context";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { BottomNav } from "./bottom-nav";
import { RunDueRecurring } from "./run-due-recurring";
import { PageTransition } from "./page-transition";

export function AppShell({
  data,
  children,
}: {
  data: Omit<AppData, "refresh">;
  children: React.ReactNode;
}) {
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
