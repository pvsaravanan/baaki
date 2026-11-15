"use client";
import { Capacitor } from "@capacitor/core";

/**
 * Hand a generated file to the user. On the phone, a WebView can't "download"
 * a blob, so the file is written to the app's cache and opened in the phone's
 * share sheet (Drive, WhatsApp, Files, email…). In a browser it downloads as
 * usual. Returns false if the user dismissed the share sheet or it failed.
 */
export async function saveFile(filename: string, blob: Blob): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return true;
  }

  const [{ Filesystem, Directory }, { Share }] = await Promise.all([
    import("@capacitor/filesystem"),
    import("@capacitor/share"),
  ]);
  // Earlier exports (a full backup holds every transaction) shouldn't pile up
  // in the app's cache. They can't be removed right after sharing, as the app
  // that received one may still be reading it, so the next export clears them.
  try {
    const { files } = await Filesystem.readdir({ path: "", directory: Directory.Cache });
    await Promise.all(
      files
        .filter((f) => f.name.startsWith("baaki-") && f.name !== filename)
        .map((f) => Filesystem.deleteFile({ path: f.name, directory: Directory.Cache }).catch(() => undefined)),
    );
  } catch {
    // Best effort: a failed cleanup must never stop the export.
  }
  const { uri } = await Filesystem.writeFile({
    path: filename,
    data: await toBase64(blob),
    directory: Directory.Cache,
  });
  try {
    await Share.share({ title: filename, files: [uri] });
    return true;
  } catch (err) {
    // Closing the share sheet without picking an app rejects; that's not an error.
    if (err instanceof Error && /cancel/i.test(err.message)) return false;
    throw err;
  }
}

async function toBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}
