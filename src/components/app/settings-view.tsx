"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Camera, ChevronDown, ChevronRight, ChevronUp, Database, Download, FileSpreadsheet, LogOut, Upload,
} from "lucide-react";
import { DASHBOARD_WIDGETS, normalizeWidgets, widgetKind, widgetLabel, type WidgetKey, type WidgetKind } from "@/lib/dashboard-widgets";
import { apiPatch, ApiError, downloadFile } from "@/lib/http";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";
import { useAppData } from "@/components/app/app-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { SelectMenu } from "@/components/ui/select-menu";
import { Switch } from "@/components/ui/switch";
import { AvatarCropModal } from "./avatar-crop-modal";
import { UserAvatar } from "./user-avatar";
import { ExportModal } from "./export-modal";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";

interface WidgetItem {
  key: WidgetKey;
  enabled: boolean;
}

/**
 * The ordered widget list, grouped tiles-then-cards (the dashboard renders
 * them in separate rows): each group's saved widgets first, in saved order,
 * then the rest of that group toggled off.
 */
function buildWidgetItems(saved: string[]): WidgetItem[] {
  const enabled = normalizeWidgets(saved);
  const items: WidgetItem[] = [];
  for (const kind of ["tile", "card"] as const) {
    for (const key of enabled) if (widgetKind(key) === kind) items.push({ key, enabled: true });
    for (const { key } of DASHBOARD_WIDGETS) {
      if (widgetKind(key) === kind && !enabled.includes(key)) items.push({ key, enabled: false });
    }
  }
  return items;
}

const WIDGET_GROUPS: { kind: WidgetKind; title: string; hint: string }[] = [
  { kind: "tile", title: "Top tiles", hint: "The row of figures at the top" },
  { kind: "card", title: "Cards", hint: "Everything below the tiles" },
];

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
  const confirm = useConfirm();
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
    const ok = await confirm({
      title: "Remove your photo?",
      message: "Your profile photo will be removed. You can upload a new one any time.",
      confirmLabel: "Remove",
      danger: true,
    });
    if (!ok) return;
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

  /** Swap with the neighbour above/below — only within the same group. */
  function move(index: number, dir: -1 | 1) {
    setWidgets((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      if (widgetKind(prev[target].key) !== widgetKind(prev[index].key)) return prev;
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
              <UserAvatar url={user.avatarUrl} className="h-20 w-20" />
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
          <Row title="Dark mode" description="This will come soon.">
            <span className="inline-block border border-border bg-surface-2 px-2 py-1 text-label-sm uppercase text-muted">
              Coming soon
            </span>
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
          description="Pick what your dashboard shows and in what order, top to bottom."
          aside={
            <span className="text-label-md uppercase text-muted">
              {enabledOrder.length} of {widgets.length} shown
            </span>
          }
        >
          {WIDGET_GROUPS.map((group) => {
            const members = widgets.map((w, i) => ({ w, i })).filter(({ w }) => widgetKind(w.key) === group.kind);
            const enabledInGroup = members.filter(({ w }) => w.enabled).map(({ w }) => w.key);
            return (
              <div key={group.kind}>
                <div className="flex items-baseline justify-between gap-3 border-b border-border bg-surface-2 px-3 py-2 sm:px-5">
                  <span className="text-label-md uppercase text-fg">{group.title}</span>
                  <span className="text-xs text-muted">{group.hint}</span>
                </div>
                <ul className="divide-y divide-border">
                  {members.map(({ w, i }, pos) => (
                    <li key={w.key} className="flex items-center gap-3 px-3 py-2.5 sm:px-5">
                      <span
                        className={cn(
                          "w-6 shrink-0 text-center text-label-md tabular-nums",
                          w.enabled ? "text-fg" : "text-faint",
                        )}
                      >
                        {w.enabled ? enabledInGroup.indexOf(w.key) + 1 : "–"}
                      </span>
                      <span className={cn("min-w-0 flex-1 truncate text-body-sm", w.enabled ? "text-fg" : "text-faint")}>
                        {widgetLabel(w.key)}
                      </span>
                      <div className="flex shrink-0">
                        <button
                          type="button"
                          aria-label={`Move ${widgetLabel(w.key)} up`}
                          disabled={pos === 0}
                          onClick={() => move(i, -1)}
                          className="flex h-8 w-8 items-center justify-center text-faint transition-colors hover:text-fg disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <ChevronUp className="h-4 w-4" aria-hidden />
                        </button>
                        <button
                          type="button"
                          aria-label={`Move ${widgetLabel(w.key)} down`}
                          disabled={pos === members.length - 1}
                          onClick={() => move(i, 1)}
                          className="flex h-8 w-8 items-center justify-center text-faint transition-colors hover:text-fg disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <ChevronDown className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                      <Switch checked={w.enabled} onChange={() => toggleWidget(w.key)} label={widgetLabel(w.key)} />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
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
            description="Everything — accounts, transactions, budgets, goals, people and splits — as one JSON file."
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
      <span className="flex h-10 w-10 shrink-0 items-center justify-center text-fg">
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
