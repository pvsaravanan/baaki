"use client";
import { Capacitor, registerPlugin, type PermissionState } from "@capacitor/core";

/**
 * Picking a person from the phone's address book. Only works in the Android
 * app; in a browser there's no address book to read.
 */

export interface PickedContact {
  name: string;
  /** Small JPEG data: URL of the contact's photo, or null when they have none. */
  photo: string | null;
}

export const canPickDeviceContact = () => Capacitor.isNativePlatform();

// Android's own contact picker (android/…/ContactPickerPlugin.java). Read-only
// contacts access ("contacts") is needed for the person's photo.
type ContactsPermission = { contacts: PermissionState };
const ContactPicker = registerPlugin<{
  checkPermissions(): Promise<ContactsPermission>;
  requestPermissions(): Promise<ContactsPermission>;
  pick(): Promise<{ name?: string; photo?: string }>;
}>("ContactPicker");

const PHOTO_SIZE = 128;

/** Shrink a photo to a small centred square so it stays cheap to store and back up. */
function shrink(base64: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      if (!side) return resolve(null);
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = PHOTO_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(null);
      ctx.drawImage(
        img,
        (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side,
        0, 0, PHOTO_SIZE, PHOTO_SIZE,
      );
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => resolve(null);
    img.src = base64.startsWith("data:") ? base64 : `data:image/jpeg;base64,${base64}`;
  });
}

/**
 * Open the phone's contact picker. Resolves null if the person backs out or
 * the contact has no name; throws a readable Error if access is refused.
 */
export async function pickDeviceContact(): Promise<PickedContact | null> {
  let permission = await ContactPicker.checkPermissions();
  if (permission.contacts !== "granted") permission = await ContactPicker.requestPermissions();
  if (permission.contacts !== "granted") {
    throw new Error("Allow contacts access in your phone's settings to pick someone.");
  }
  const { name, photo } = await ContactPicker.pick();
  const trimmed = name?.trim();
  if (!trimmed) return null;
  return { name: trimmed.slice(0, 80), photo: photo ? await shrink(photo) : null };
}
