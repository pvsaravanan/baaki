"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  DatabaseBackup,
  IndianRupee,
  Info,
  Compass,
  Languages,
  LayoutDashboard,
  Lock,
  Moon,
  Smartphone,
} from "lucide-react";
import { version } from "../../../package.json";
import { Modal } from "@/components/ui/modal";
import { useAppData } from "./app-data";
import { UserAvatar } from "./user-avatar";
import { BackButton } from "./back-button";
import { SettingsArt } from "./page-illustrations";
import { startAppTour } from "./app-tour";
import { DashboardSection } from "./settings/dashboard-section";
import { DataSection } from "./settings/data-section";
import { DefaultAccountRow } from "./settings/preferences-section";
import { ProfileSection } from "./settings/profile-section";
import { SecuritySection } from "./settings/security-section";
import { Group, InfoRow, NavRow } from "./settings/settings-rows";

type Panel = "profile" | "dashboard" | "security" | "data";

const PANEL_TITLES: Record<Panel, string> = {
  profile: "Profile",
  dashboard: "Dashboard Layout",
  security: "Privacy & Security",
  data: "Backup & Data",
};

export function SettingsView() {
  return (
    // The top bar links here with ?choose=picture, and reading that needs Suspense.
    <Suspense>
      <Settings />
    </Suspense>
  );
}

function Settings() {
  const { user, preference } = useAppData();
  const [panel, setPanel] = useState<Panel | null>(null);

  // The picture picker lives in the profile panel; ProfileSection opens it from the same query.
  const choose = useSearchParams().get("choose");
  useEffect(() => {
    if (choose === "picture") setPanel("profile");
  }, [choose]);

  // The app tour asks for your name on the profile panel and opens it with ?panel=profile.
  const panelQuery = useSearchParams().get("panel");
  useEffect(() => {
    if (panelQuery === "profile") setPanel("profile");
  }, [panelQuery]);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <header className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <BackButton />
            <h1 className="text-headline-md text-fg sm:text-headline-lg">Settings</h1>
          </div>
          <p className="mt-1 text-body-sm text-muted">Your profile, preferences and data.</p>
        </div>
        <SettingsArt />
      </header>

      <button
        type="button"
        onClick={() => setPanel("profile")}
        className="flex w-full items-center gap-3.5 rounded-xl bg-brand-soft/40 p-3.5 text-left transition-colors active:bg-brand-soft/60"
      >
        <UserAvatar url={user.avatarUrl} className="h-14 w-14 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-bold text-fg">{user.name}</span>
          <span className="mt-0.5 block text-xs text-muted">Your name and picture</span>
        </span>
        <ChevronRight aria-hidden className="h-5 w-5 shrink-0 text-fg" />
      </button>

      <Group title="Preferences">
        <InfoRow icon={<Moon />} label="Appearance" value="Dark mode soon" />
        <DefaultAccountRow />
        <NavRow icon={<LayoutDashboard />} label="Dashboard layout" onClick={() => setPanel("dashboard")} />
        <InfoRow icon={<IndianRupee />} label="Currency" value="INR (₹)" />
        <InfoRow icon={<Languages />} label="Language" value="English" />
      </Group>

      <Group title="Data">
        <NavRow
          icon={<DatabaseBackup />}
          label="Backup & Data"
          value={
            // Says where the data is, so nobody mistakes this for a synced copy.
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-fg">
              <Smartphone aria-hidden className="h-3.5 w-3.5 shrink-0" />
              On this phone
            </span>
          }
          onClick={() => setPanel("data")}
        />
      </Group>

      <Group title="App">
        <NavRow
          icon={<Lock />}
          label="Privacy & Security"
          value={preference.appLock ? "App lock on" : "App lock off"}
          onClick={() => setPanel("security")}
        />
        <NavRow icon={<Compass />} label="App tour" value="Replay" onClick={startAppTour} />
        <InfoRow icon={<Info />} label="About Baaki" value={`v${version}`} />
      </Group>

      {panel && (
        <Modal open fullScreen onClose={() => setPanel(null)} title={PANEL_TITLES[panel]}>
          <div className="space-y-3 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(0.75rem+env(safe-area-inset-top))] sm:pb-4 sm:pt-4">
            <header className="flex items-center gap-3">
              <button type="button" onClick={() => setPanel(null)} aria-label="Back" className="-ml-1 p-1 text-fg">
                <ArrowLeft className="h-6 w-6" />
              </button>
              <h2 className="text-headline-sm tracking-normal text-fg">{PANEL_TITLES[panel]}</h2>
            </header>
            {panel === "profile" && <ProfileSection />}
            {panel === "dashboard" && <DashboardSection />}
            {panel === "security" && <SecuritySection />}
            {panel === "data" && <DataSection />}
          </div>
        </Modal>
      )}
    </div>
  );
}
