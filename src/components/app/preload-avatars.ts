"use client";
import { AVATAR_THUMBS } from "./avatar-assets";

// Held so the browser keeps them fetched and decoded until the picker shows.
const preloaded: HTMLImageElement[] = [];

/**
 * Fetch and decode the picker grid's pictures (the raster thumbnails) ahead of
 * the picker, so it opens fully drawn instead of filling in picture by
 * picture. Safe to call often: only the first call does anything.
 */
export function preloadAvatars() {
  if (preloaded.length || typeof window === "undefined") return;
  for (const { src } of Object.values(AVATAR_THUMBS)) {
    const img = new Image();
    img.decoding = "async";
    img.src = src;
    img.decode().catch(() => undefined); // a failed preload just means the picker loads it later
    preloaded.push(img);
  }
}
