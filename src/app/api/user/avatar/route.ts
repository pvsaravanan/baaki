import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, json, withUser } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "avatars";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
const ALLOWED = Object.keys(EXT);

type Storage = ReturnType<typeof createAdminClient>["storage"];

/**
 * Identify PNG/JPEG/WebP by magic bytes. `file.type` is whatever the client
 * claims in the multipart part's Content-Type header — trivially spoofable —
 * so it's only used as a cheap up-front rejection; the bytes actually
 * written (and the content-type Storage serves them with, from a public
 * bucket) are decided from the real file contents.
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

/** Create the public avatars bucket on first use so no manual setup is needed. */
async function ensureBucket(storage: Storage) {
  const { data } = await storage.getBucket(BUCKET);
  if (data) return;
  await storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: MAX_BYTES,
    allowedMimeTypes: ALLOWED,
  });
}

/** Delete any existing avatar files for this user (keeps the folder to one), excluding `keepPath` if given. */
async function clearExisting(storage: Storage, userId: string, keepPath?: string) {
  const { data } = await storage.from(BUCKET).list(userId);
  if (data && data.length) {
    const paths = data.map((f) => `${userId}/${f.name}`).filter((p) => p !== keepPath);
    if (paths.length) await storage.from(BUCKET).remove(paths);
  }
}

export const POST = withUser(async (user, req: NextRequest) => {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof Blob)) return apiError("No image provided", 400);
  if (!ALLOWED.includes(file.type)) return apiError("Use a PNG, JPG or WebP image", 415);
  if (file.size > MAX_BYTES) return apiError("Image must be 5 MB or smaller", 413);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const sniffed = sniffImageType(bytes);
  if (!sniffed) return apiError("Use a PNG, JPG or WebP image", 415);

  const storage = createAdminClient().storage;
  await ensureBucket(storage);

  const path = `${user.id}/${Date.now()}.${EXT[sniffed]}`;
  const { error: uploadError } = await storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: sniffed, upsert: true });
  if (uploadError) return apiError("Could not upload the image. Please try again.", 502);

  await clearExisting(storage, user.id, path);

  const avatarUrl = storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  await prisma.user.update({ where: { id: user.id }, data: { avatarUrl } });
  return json({ avatarUrl });
});

export const DELETE = withUser(async (user) => {
  await clearExisting(createAdminClient().storage, user.id);
  await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: null } });
  return json({ ok: true });
});
