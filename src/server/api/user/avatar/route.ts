import type { NextRequest } from "@/server/request";
import { prisma } from "@/lib/db";
import { apiError, json, withUser } from "@/lib/api";

// The cropper sends a 256px JPEG (~20–40 KB); the photo is kept in the
// database as a data: URL, so there's no file storage to manage.
const MAX_BYTES = 1024 * 1024; // 1 MB
const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
const ALLOWED = Object.keys(EXT);

/**
 * Identify PNG/JPEG/WebP by magic bytes. `file.type` is whatever the client
 * claims in the multipart part's Content-Type header — trivially spoofable —
 * so it's only used as a cheap up-front rejection; the stored image's type
 * is decided from the real file contents.
 */
function sniffImageType(bytes: Uint8Array): keyof typeof EXT | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
    && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return "image/webp";
  }
  return null;
}

export const POST = withUser(async (user, req: NextRequest) => {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof Blob)) return apiError("No image provided", 400);
  if (!ALLOWED.includes(file.type)) return apiError("Use a PNG, JPG or WebP image", 415);
  if (file.size > MAX_BYTES) return apiError("Image must be 1 MB or smaller", 413);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const sniffed = sniffImageType(bytes);
  if (!sniffed) return apiError("Use a PNG, JPG or WebP image", 415);

  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  const avatarUrl = `data:${sniffed};base64,${btoa(binary)}`;
  await prisma.user.update({ where: { id: user.id }, data: { avatarUrl } });
  return json({ avatarUrl });
});

export const DELETE = withUser(async (user) => {
  await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: null } });
  return json({ ok: true });
});
