"use client";
import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { DEFAULT_AVATAR, readAvatar, type AvatarId } from "@/lib/avatars";
import { apiPatch, ApiError } from "@/lib/http";
import { useAppData } from "@/components/app/app-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import { AvatarPicker } from "../avatar-picker";
import { UserAvatar } from "../user-avatar";
import { Row, Section } from "./layout";

export function ProfileSection() {
  const { user, refresh } = useAppData();
  const { success, error } = useToast();
  const confirm = useConfirm();

  const [name, setName] = useState(user.name);
  const [savingName, setSavingName] = useState(false);
  // Resync if the saved name changes underneath us (e.g. after a refresh).
  useEffect(() => setName(user.name), [user.name]);
  const nameDirty = name.trim().length > 0 && name.trim() !== user.name;

  const current = readAvatar(user.avatarUrl);
  const hasAvatar = current.kind !== "none";
  // The picture being chosen in the picker, or null while it's closed.
  const [choosing, setChoosing] = useState<AvatarId | null>(null);
  const [savingAvatar, setSavingAvatar] = useState(false);

  async function saveAvatar(avatar: AvatarId | null, done: string) {
    setSavingAvatar(true);
    try {
      await apiPatch("/api/user", { avatar });
      success(done);
      setChoosing(null);
      refresh();
    } catch (e) {
      error(e instanceof ApiError ? e.message : "Could not change your picture");
    } finally {
      setSavingAvatar(false);
    }
  }

  async function handleRemoveAvatar() {
    const ok = await confirm({
      title: "Remove your picture?",
      message: "You'll show as a plain silhouette. You can choose a picture again any time.",
      confirmLabel: "Remove",
      danger: true,
    });
    if (ok) await saveAvatar(null, "Picture removed");
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

  const openPicker = () => setChoosing(current.kind === "picture" ? current.id : DEFAULT_AVATAR);

  return (
    <>
      <Section id="profile" title="Profile" description="How you appear in baaki.">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
          <div className="relative h-20 w-20 shrink-0">
            <UserAvatar url={user.avatarUrl} className="h-20 w-20" />
            <button
              type="button"
              onClick={openPicker}
              disabled={savingAvatar}
              aria-label={hasAvatar ? "Change picture" : "Choose a picture"}
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center border border-border bg-brand text-brand-fg shadow-stamp-sm transition-transform hover:-translate-x-px hover:-translate-y-px active:translate-x-px active:translate-y-px active:shadow-none disabled:opacity-50"
            >
              <Pencil className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-headline-sm text-fg">{user.name}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              <button
                type="button"
                onClick={openPicker}
                disabled={savingAvatar}
                className="text-label-md uppercase text-accent underline-offset-4 hover:underline disabled:opacity-50"
              >
                {hasAvatar ? "Change picture" : "Choose a picture"}
              </button>
              {hasAvatar && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={savingAvatar}
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
          description="Used in your dashboard greeting."
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
      </Section>

      <Modal
        open={choosing !== null}
        onClose={() => setChoosing(null)}
        title="Profile picture"
        busy={savingAvatar}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setChoosing(null)} disabled={savingAvatar}>
              Cancel
            </Button>
            <Button onClick={() => choosing && saveAvatar(choosing, "Picture updated")} loading={savingAvatar}>
              Save
            </Button>
          </div>
        }
      >
        {choosing && <AvatarPicker value={choosing} onChange={setChoosing} />}
      </Modal>
    </>
  );
}
