"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Camera, Check, ChevronDown, ChevronRight, ChevronUp, Database, Download, FileSpreadsheet, LogOut, Upload,
} from "lucide-react";
import { DEFAULT_DASHBOARD_WIDGETS, WIDGET_LABELS, type WidgetKey } from "@/lib/constants";
import { apiPatch, ApiError, downloadFile } from "@/lib/http";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";
import { useAppData } from "@/components/app/app-data";
import { useTheme, type Theme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { SelectMenu } from "@/components/ui/select-menu";
import { Switch } from "@/components/ui/switch";
import { AvatarCropModal } from "./avatar-crop-modal";
import { ExportModal } from "./export-modal";
import { useToast } from "@/components/ui/toast";

interface WidgetItem {
  key: WidgetKey;
  enabled: boolean;
}

/** Build the ordered widget list: saved widgets first (in their saved order),
 *  then any newly-added defaults appended and toggled off. */
function buildWidgetItems(saved: string[]): WidgetItem[] {
  const valid = saved.filter((k): k is WidgetKey =>
    (DEFAULT_DASHBOARD_WIDGETS as readonly string[]).includes(k),
  );
  const seen = new Set<WidgetKey>(valid);
  const items: WidgetItem[] = valid.map((key) => ({ key, enabled: true }));
  for (const key of DEFAULT_DASHBOARD_WIDGETS) {
    if (!seen.has(key)) items.push({ key, enabled: false });
  }
  return items;
}

const SECTIONS = [
  { id: "profile", label: "Profile" },
  { id: "preferences", label: "Preferences" },
  { id: "dashboard", label: "Dashboard" },
  { id: "data", label: "Data & backup" },
  { id: "session", label: "Session" },
] as const;

export function SettingsView() {
  const { user, accounts, preference, refresh } = useAppData();
  const { success, error } = useToast();
  const router = useRouter();

  const [signingOut, setSigningOut] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);

  const [name, setName] = useState(user.name);
  const [savingName, setSavingName] = useState(false);
  // Resync if the saved name changes underneath us (e.g. after a refresh).
  useEffect(() => setName(user.name), [user.name]);
  const nameDirty = name.trim().length > 0 && name.trim() !== user.name;

  const [showExport, setShowExport] = useState(false);
  const [downloadingBackup, setDownloadingBackup] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  async function handleBackupDownload() {
    setDownloadingBackup(true);
    await downloadFile("/api/export?format=json", (message) => error(message));
    setDownloadingBackup(false);
  }
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const initials = user.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  function handleAvatarSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // let the same file be picked again later
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      error("Please choose an image file");
      return;
    }
    // Open the cropper; the actual upload happens once the user confirms.
    setCropSrc(URL.createObjectURL(file));
  }

  function closeCrop() {
    setCropSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }

  async function handleCropConfirm(blob: Blob) {
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append("file", blob, "avatar.jpg");
      const res = await fetch("/api/user/avatar", { method: "POST", body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Upload failed");
      }
      success("Photo updated");
      closeCrop();
      refresh();
    } catch (e2) {
      error(e2 instanceof Error ? e2.message : "Could not upload photo");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleRemoveAvatar() {
    setUploadingAvatar(true);
    try {
      const res = await fetch("/api/user/avatar", { method: "DELETE" });
      if (!res.ok) throw new Error("Remove failed");
      success("Photo removed");
      refresh();
    } catch {
      error("Could not remove photo");
    } finally {
      setUploadingAvatar(false);
    }
  }

  const [widgets, setWidgets] = useState<WidgetItem[]>(() =>
    buildWidgetItems(preference.dashboardWidgets),
  );
  const [savingLayout, setSavingLayout] = useState(false);

  // Resync when the saved layout changes underneath us (e.g. edited on another
  // tab/device, then refreshed) — the initial-state initializer runs only once.
  const savedLayoutKey = JSON.stringify(preference.dashboardWidgets);
  useEffect(() => {
    setWidgets(buildWidgetItems(preference.dashboardWidgets));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedLayoutKey]);

  const enabledOrder = useMemo(
    () => widgets.filter((w) => w.enabled).map((w) => w.key),
    [widgets],
  );
  const layoutDirty = useMemo(
    () => JSON.stringify(enabledOrder) !== JSON.stringify(preference.dashboardWidgets),
    [enabledOrder, preference.dashboardWidgets],
  );

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setSigningOut(false);
      error(signOutError.message || "Could not sign out");
      return;
    }
    router.push("/login");
    router.refresh();
  }

  async function handleSaveName() {
    setSavingName(true);
    try {
      await apiPatch("/api/user", { name: name.trim() });
      success("Name updated");
      refresh();
    } catch (e) {
      error(e instanceof ApiError ? e.message : "Could not update name");
    } finally {
      setSavingName(false);
    }
  }

  async function handleDefaultAccount(value: string) {
    setSavingAccount(true);
    try {
      await apiPatch("/api/preferences", { defaultAccountId: value || null });
      success("Saved");
      refresh();
    } catch (e) {
      error(e instanceof ApiError ? e.message : "Could not save default account");
    } finally {
      setSavingAccount(false);
    }
  }

  function toggleWidget(key: WidgetKey) {
    setWidgets((prev) => prev.map((w) => (w.key === key ? { ...w, enabled: !w.enabled } : w)));
  }

  function move(index: number, dir: -1 | 1) {
    setWidgets((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleSaveLayout() {
    setSavingLayout(true);
    try {
      await apiPatch("/api/preferences", { dashboardWidgets: enabledOrder });
      success("Dashboard layout saved");
      refresh();
    } catch (e) {
      error(e instanceof ApiError ? e.message : "Could not save layout");
    } finally {
      setSavingLayout(false);
    }
  }

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
        {/* Profile */}
        <Section id="profile" title="Profile" description="How you appear in baaki.">
          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
            <div className="relative h-20 w-20 shrink-0">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt="" className="h-20 w-20 rounded-full border border-border object-cover" />
              ) : (
                <span className="flex h-20 w-20 items-center justify-center rounded-full border border-border bg-brand-soft text-2xl font-bold text-fg">
                  {initials || "U"}
                </span>
              )}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploadingAvatar}
                aria-label={user.avatarUrl ? "Change photo" : "Upload photo"}
                className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center border border-border bg-brand text-brand-fg shadow-stamp-sm transition-transform hover:-translate-x-px hover:-translate-y-px active:translate-x-px active:translate-y-px active:shadow-none disabled:opacity-50"
              >
                <Camera className="h-4 w-4" aria-hidden />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleAvatarSelected}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-headline-sm text-fg">{user.name}</p>
              <p className="mt-1 truncate text-body-sm text-muted">{user.email}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="text-label-md uppercase text-accent underline-offset-4 hover:underline disabled:opacity-50"
                >
                  {uploadingAvatar ? "Working…" : user.avatarUrl ? "Change photo" : "Upload photo"}
                </button>
                {user.avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    disabled={uploadingAvatar}
                    className="text-label-md uppercase text-muted underline-offset-4 hover:text-fg hover:underline disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
          <Row
            title="Display name"
            description="Used in your dashboard greeting and account menu."
            htmlFor="profile-name"
            stacked
          >
            <div className="flex gap-2">
              <Input
                id="profile-name"
                value={name}
                maxLength={80}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && nameDirty && !savingName) handleSaveName();
                }}
              />
              <Button onClick={handleSaveName} loading={savingName} disabled={!nameDirty} className="shrink-0">
                Save
              </Button>
            </div>
          </Row>
          <Row title="Email" description="Used to sign in. It can't be changed here.">
            <span className="block max-w-full truncate text-body-sm text-fg sm:max-w-[16rem]">{user.email}</span>
          </Row>
        </Section>

        {/* Preferences */}
        <Section id="preferences" title="Preferences" description="How baaki looks and behaves.">
          <Row title="Theme" description="System follows your device's light or dark mode." stacked>
            <ThemeTiles />
          </Row>
          <Row
            title="Default account"
            description="Pre-selected when you add a transaction."
            htmlFor="default-account"
          >
            <SelectMenu
              id="default-account"
              value={preference.defaultAccountId ?? ""}
              disabled={savingAccount}
              onChange={handleDefaultAccount}
              options={[{ value: "", label: "No default" }, ...accounts.map((a) => ({ value: a.id, label: a.name }))]}
              className="w-full sm:w-56"
            />
          </Row>
        </Section>

        {/* Dashboard widgets */}
        <Section
          id="dashboard"
          title="Dashboard"
          description="Pick the widgets on your dashboard and their order, top to bottom."
          aside={
            <span className="text-label-md uppercase text-muted">
              {enabledOrder.length} of {widgets.length} shown
            </span>
          }
        >
          <ul className="divide-y divide-border">
            {widgets.map((w, i) => (
              <li key={w.key} className="flex items-center gap-3 px-3 py-2.5 sm:px-5">
                <span
                  className={cn(
                    "w-6 shrink-0 text-center text-label-md tabular-nums",
                    w.enabled ? "text-fg" : "text-faint",
                  )}
                >
                  {w.enabled ? enabledOrder.indexOf(w.key) + 1 : "–"}
                </span>
                <span className={cn("min-w-0 flex-1 truncate text-body-sm", w.enabled ? "text-fg" : "text-faint")}>
                  {WIDGET_LABELS[w.key]}
                </span>
                <div className="flex shrink-0">
                  <button
                    type="button"
                    aria-label={`Move ${WIDGET_LABELS[w.key]} up`}
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                    className="flex h-8 w-8 items-center justify-center text-faint transition-colors hover:text-fg disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronUp className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${WIDGET_LABELS[w.key]} down`}
                    disabled={i === widgets.length - 1}
                    onClick={() => move(i, 1)}
                    className="flex h-8 w-8 items-center justify-center text-faint transition-colors hover:text-fg disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronDown className="h-4 w-4" aria-hidden />
                  </button>
                </div>
                <Switch checked={w.enabled} onChange={() => toggleWidget(w.key)} label={WIDGET_LABELS[w.key]} />
              </li>
            ))}
          </ul>
          {/* Save bar — only when the layout differs from what's saved. */}
          {layoutDirty && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-brand-soft px-5 py-3">
              <span className="text-body-sm text-fg">You have unsaved changes.</span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setWidgets(buildWidgetItems(preference.dashboardWidgets))}
                  disabled={savingLayout}
                >
                  Discard
                </Button>
                <Button size="sm" onClick={handleSaveLayout} loading={savingLayout}>
                  Save layout
                </Button>
              </div>
            </div>
          )}
        </Section>

        {/* Data & backup */}
        <Section id="data" title="Data & backup" description="Your data is always yours — take it with you any time.">
          <ActionRow
            icon={<Database className="h-5 w-5" aria-hidden />}
            title="Full backup"
            description="Everything — accounts, transactions, budgets, goals — as one JSON file."
            onClick={handleBackupDownload}
            busy={downloadingBackup}
            trailing={<Download className="h-4 w-4" aria-hidden />}
          />
          <ActionRow
            icon={<FileSpreadsheet className="h-5 w-5" aria-hidden />}
            title="Export transactions"
            description="A CSV for a date range, ready for a spreadsheet."
            onClick={() => setShowExport(true)}
            trailing={<Download className="h-4 w-4" aria-hidden />}
          />
          <ActionRow
            icon={<Upload className="h-5 w-5" aria-hidden />}
            title="Import or restore"
            description="Bring in a bank CSV or restore a baaki backup."
            href="/import"
            trailing={<ChevronRight className="h-4 w-4" aria-hidden />}
          />
        </Section>

        {/* Session */}
        <Section id="session" title="Session">
          <Row title="Sign out" description={`Signed in as ${user.email}`}>
            <Button variant="outline" onClick={handleSignOut} loading={signingOut} className="w-full sm:w-auto">
              <LogOut className="h-4 w-4" aria-hidden />
              Sign out
            </Button>
          </Row>
        </Section>
      </div>

      <AvatarCropModal
        src={cropSrc}
        open={cropSrc !== null}
        busy={uploadingAvatar}
        onCancel={closeCrop}
        onConfirm={handleCropConfirm}
      />
      <ExportModal open={showExport} onClose={() => setShowExport(false)} />
    </div>
  );
}

/** A titled group of settings: heading above, rows inside one outlined card. */
function Section({
  id, title, description, aside, children,
}: {
  id: string;
  title: string;
  description?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-4">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 id={`${id}-title`} className="text-label-lg uppercase tracking-[0.06em] text-fg">{title}</h2>
          {description && <p className="mt-1 text-body-sm text-muted">{description}</p>}
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </div>
      <div className="divide-y divide-border rounded-md border border-border bg-surface shadow-card">{children}</div>
    </section>
  );
}

/** One setting: label and help on the left, its control on the right (or below, when `stacked`). */
function Row({
  title, description, htmlFor, stacked, children,
}: {
  title: string;
  description?: string;
  htmlFor?: string;
  stacked?: boolean;
  children: React.ReactNode;
}) {
  const Label = htmlFor ? "label" : "p";
  return (
    <div
      className={cn(
        "flex flex-col gap-3 p-5",
        !stacked && "sm:flex-row sm:items-center sm:justify-between sm:gap-6",
      )}
    >
      <div className="min-w-0">
        <Label htmlFor={htmlFor} className="block text-body-sm font-bold text-fg">{title}</Label>
        {description && <p className="mt-0.5 text-body-sm text-muted">{description}</p>}
      </div>
      <div className={cn("min-w-0", !stacked && "sm:shrink-0")}>{children}</div>
    </div>
  );
}

/** A full-width tappable row that runs an action or links somewhere. */
function ActionRow({
  icon, title, description, trailing, onClick, href, busy,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  trailing: React.ReactNode;
  onClick?: () => void;
  href?: string;
  busy?: boolean;
}) {
  const inner = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-border bg-surface-2 text-fg">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-body-sm font-bold text-fg">{busy ? `${title} — preparing…` : title}</span>
        <span className="mt-0.5 block text-body-sm text-muted">{description}</span>
      </span>
      <span className="shrink-0 text-muted transition-colors group-hover:text-fg">{trailing}</span>
    </>
  );
  const cls =
    "group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-surface-2 focus:outline-none focus-visible:bg-surface-2 disabled:cursor-wait disabled:opacity-60";
  return href ? (
    <Link href={href} className={cls}>{inner}</Link>
  ) : (
    <button type="button" onClick={onClick} disabled={busy} className={cls}>{inner}</button>
  );
}

// Fixed swatches so each tile previews its theme whatever theme is active.
const THEME_PREVIEWS: Record<Exclude<Theme, "system">, { bg: string; card: string; ink: string; accent: string }> = {
  light: { bg: "#f4f1ea", card: "#e9e4d9", ink: "#1a1a1a", accent: "#d88060" },
  dark: { bg: "#191715", card: "#28251f", ink: "#efeadf", accent: "#e08a66" },
};

function ThemePreview({ theme }: { theme: Exclude<Theme, "system"> }) {
  const c = THEME_PREVIEWS[theme];
  return (
    <div className="flex h-full w-full flex-col gap-1.5 p-2.5" style={{ background: c.bg }}>
      <div className="h-1.5 w-8" style={{ background: c.ink }} />
      <div className="flex flex-1 gap-1.5">
        <div className="flex flex-1 flex-col gap-1 border p-1.5" style={{ background: c.card, borderColor: c.ink }}>
          <div className="h-1 w-3/4" style={{ background: c.ink, opacity: 0.7 }} />
          <div className="h-1 w-1/2" style={{ background: c.ink, opacity: 0.4 }} />
          <div className="mt-auto h-2 w-6" style={{ background: c.accent }} />
        </div>
        <div className="w-1/3 border" style={{ background: c.card, borderColor: c.ink }} />
      </div>
    </div>
  );
}

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

/** Theme picker as preview tiles — you see what you're choosing. */
function ThemeTiles() {
  const { theme, setTheme } = useTheme();
  return (
    <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-3 sm:max-w-md">
      {THEME_OPTIONS.map((o) => {
        const selected = theme === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setTheme(o.value)}
            className="group flex flex-col gap-2 text-left focus:outline-none"
          >
            <span
              className={cn(
                "relative block aspect-[4/3] overflow-hidden border transition-[box-shadow,transform]",
                "group-focus-visible:ring-2 group-focus-visible:ring-ring/40",
                selected
                  ? "border-border shadow-stamp"
                  : "border-border/40 group-hover:-translate-x-px group-hover:-translate-y-px group-hover:border-border group-hover:shadow-stamp-sm",
              )}
            >
              {o.value === "system" ? (
                // Half light, half dark, split on the diagonal.
                <>
                  <span className="absolute inset-0"><ThemePreview theme="light" /></span>
                  <span className="absolute inset-0 [clip-path:polygon(100%_0,100%_100%,0_100%)]">
                    <ThemePreview theme="dark" />
                  </span>
                </>
              ) : (
                <ThemePreview theme={o.value} />
              )}
              {selected && (
                <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center border border-border bg-brand text-brand-fg">
                  <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                </span>
              )}
            </span>
            <span className={cn("text-label-md uppercase", selected ? "text-fg" : "text-muted group-hover:text-fg")}>
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * The section being read, for the index: the last one whose top has passed
 * the upper third of the scroll area — or the last section once scrolled to
 * the bottom, since a short final section may never reach that line.
 */
function useActiveSection(ids: readonly string[]) {
  const [active, setActive] = useState<string>(ids[0]);
  const key = ids.join(",");
  useEffect(() => {
    const first = document.getElementById(ids[0]);
    const scroller = first?.closest("main");
    if (!scroller) return;
    const update = () => {
      const top = scroller.getBoundingClientRect().top;
      const line = top + scroller.clientHeight / 3;
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }
      const scrollable = scroller.scrollHeight > scroller.clientHeight + 4;
      if (scrollable && scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 4) {
        current = ids[ids.length - 1];
      }
      setActive(current);
    };
    update();
    scroller.addEventListener("scroll", update, { passive: true });
    return () => scroller.removeEventListener("scroll", update);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return active;
}
