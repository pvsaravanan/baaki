"use client";
import { useEffect, useState } from "react";
import useSWR from "swr";
import type { PageData, PageName } from "@/server/pages";

/**
 * The app's entry point to its on-device "server" (src/server/local-server.ts).
 * The server module — with Prisma and the Postgres engine — is imported on
 * first use, so it stays out of the initial page load and never runs during
 * the static build.
 */
const server = () => import("@/server/local-server");

/**
 * Opening the on-device database and running the first queries takes a few
 * seconds on a phone. So the last result of the two screens every launch
 * opens on (the app frame's data and the dashboard) is kept in the app's own
 * storage and shown at once on the next launch, while the real data loads
 * underneath and replaces it. It never leaves the phone, and each build uses
 * its own entries, so an update can't read an older layout of the data.
 */
const CACHE_PREFIX = "baaki.page:";
const CACHE_ENTRY = `${CACHE_PREFIX}${process.env.NEXT_PUBLIC_BUILD_ID}:`;
const CACHED_PAGES = new Set<PageName>(["shell", "dashboard"]);

function readCached<K extends PageName>(name: K, key: string): PageData<K> | undefined {
  if (!CACHED_PAGES.has(name)) return undefined;
  try {
    const raw = localStorage.getItem(`${CACHE_ENTRY}${name}:${key}`);
    return raw ? (JSON.parse(raw) as PageData<K>) : undefined;
  } catch {
    return undefined;
  }
}

let cleaned = false;
function writeCached(name: PageName, key: string, data: unknown) {
  if (!CACHED_PAGES.has(name)) return;
  try {
    if (!cleaned) {
      cleaned = true;
      clearPageCache(CACHE_ENTRY); // entries from earlier builds
    }
    localStorage.setItem(`${CACHE_ENTRY}${name}:${key}`, JSON.stringify(data));
  } catch {
    // storage full or unavailable: the screen just loads the slow way
  }
}

/** Remove cached screens (all of them, or all except those starting with `keep`). */
function clearPageCache(keep?: string) {
  try {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith(CACHE_PREFIX) && !(keep && k.startsWith(keep))) localStorage.removeItem(k);
    }
  } catch {}
}

/** Answer an `/api/...` request locally; same contract as `fetch`. */
export async function localFetch(url: string, init?: RequestInit): Promise<Response> {
  return (await server()).handle(url, init);
}

type Params = Record<string, string | undefined>;

/**
 * One screen's data, kept fresh by SWR: `refresh()` (app-data) revalidates
 * every screen after a change. While a new key loads (another month, say) the
 * previous data stays on screen — `isStale` says so, for the dimmed state.
 */
export function usePageData<K extends PageName>(name: K, params: Params = {}) {
  const { data, error, isLoading, mutate } = useSWR(
    ["page", name, JSON.stringify(params)],
    async () => {
      const fresh = await (await server()).loadPage(name, params);
      writeCached(name, JSON.stringify(params), fresh);
      return fresh;
    },
    { keepPreviousData: true, revalidateOnFocus: false },
  );
  const key = JSON.stringify(params);
  // Read after mount (not while rendering), so the first render matches the
  // statically built page.
  const [cached, setCached] = useState<PageData<K>>();
  useEffect(() => setCached(readCached(name, key)), [name, key]);
  return {
    data: (data as PageData<K> | undefined) ?? cached,
    error: error as Error | undefined,
    isLoading,
    /** Showing the previous key's data while this one loads. */
    isStale: data !== undefined && isLoading,
    mutate,
    key,
  };
}

/** Delete the on-device database so the app can start over (see eraseEverything). */
export async function eraseLocalData(): Promise<void> {
  clearPageCache();
  await (await server()).eraseEverything();
}
