"use client";
import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { apiPatch, ApiError } from "@/lib/http";
import { localFetch } from "@/lib/local-api";
import { useAppData } from "@/components/app/app-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import { AvatarCropModal } from "../avatar-crop-modal";
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

  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
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
      const res = await localFetch("/api/user/avatar", { method: "POST", body: fd });
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
      const res = await localFetch("/api/user/avatar", { method: "DELETE" });
      if (!res.ok) throw new Error("Remove failed");
      success("Photo removed");
      refresh();
    } catch {
      error("Could not remove photo");
    } finally {
      setUploadingAvatar(false);
    }
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

  return (
    <>
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
      <AvatarCropModal
        src={cropSrc}
        open={cropSrc !== null}
        busy={uploadingAvatar}
        onCancel={closeCrop}
        onConfirm={handleCropConfirm}
      />
    </>
  );
}
