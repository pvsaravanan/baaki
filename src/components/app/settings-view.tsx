"use client";
import { cn } from "@/lib/cn";
import { useActiveSection } from "./settings/layout";
import { ProfileSection } from "./settings/profile-section";
import { PreferencesSection } from "./settings/preferences-section";
import { SecuritySection } from "./settings/security-section";
import { DashboardSection } from "./settings/dashboard-section";
import { DataSection } from "./settings/data-section";

const SECTIONS = [
  { id: "profile", label: "Profile" },
  { id: "preferences", label: "Preferences" },
  { id: "security", label: "Security" },
  { id: "dashboard", label: "Dashboard" },
  { id: "data", label: "Data & backup" },
] as const;

export function SettingsView() {
  const activeSection = useActiveSection(SECTIONS.map((s) => s.id));

  return (
    <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[11rem_minmax(0,1fr)]">
      {/* Section index — desktop only; on phones the sections simply stack. */}
      <nav aria-label="Settings sections" className="hidden lg:block">
        <ul className="sticky top-0 flex flex-col border-l border-border">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                aria-current={activeSection === s.id ? "true" : undefined}
                className={cn(
                  "-ml-px w-full border-l-2 py-2 pl-4 text-left text-label-md uppercase transition-colors",
                  activeSection === s.id
                    ? "border-brand text-fg"
                    : "border-transparent text-muted hover:text-fg",
                )}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex min-w-0 flex-col gap-10">
        <ProfileSection />
        <PreferencesSection />
        <SecuritySection />
        <DashboardSection />
        <DataSection />
      </div>
    </div>
  );
}
