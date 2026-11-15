"use client";
import useSWR from "swr";
import type { PageData, PageName } from "@/server/pages";
import { decodeWire } from "./wire";

/**
 * The screens' way to the server: `localFetch` answers the `/api/...` calls
 * (src/lib/request/http.ts) and `usePageData` loads one screen's data from
 * `/api/page/<name>` (src/app/api/page/[name]/route.ts). Both go over the
 * network as the signed-in user; the session cookie travels with them.
 *
 * (The module keeps the name it had when the same calls were answered on the
 * device, so the screens didn't have to change.)
 */

/** Answer an `/api/...` request; same contract as `fetch`. */
export async function localFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, { credentials: "same-origin", ...init });
}

type Params = Record<string, string | undefined>;

async function fetchPage<K extends PageName>(name: K, params: Params): Promise<PageData<K>> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined) qs.set(k, v);
  const res = await fetch(`/api/page/${name}${qs.size ? `?${qs}` : ""}`, { credentials: "same-origin" });
  if (res.status === 401) {
    window.location.href = "/login";
    return new Promise<never>(() => undefined);
  }
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? `Could not load ${name} (${res.status})`);
  return decodeWire<PageData<K>>(await res.text());
}

/**
 * One screen's data, kept fresh by SWR: `refresh()` (app-data) revalidates
 * every screen after a change. While a new key loads (another month, say) the
 * previous data stays on screen — `isStale` says so, for the dimmed state.
 */
export function usePageData<K extends PageName>(name: K, params: Params = {}) {
  const key = JSON.stringify(params);
  const { data, error, isLoading, mutate } = useSWR(["page", name, key], () => fetchPage(name, params), {
    keepPreviousData: true,
    revalidateOnFocus: false,
  });
  return {
    data: data as PageData<K> | undefined,
    /** Always false on the web: nothing is shown before it is read from the server. */
    fromCache: false,
    error: error as Error | undefined,
    isLoading,
    /** Showing the previous key's data while this one loads. */
    isStale: data !== undefined && isLoading,
    mutate,
    key,
  };
}

/** Load `path` as a new page. */
export async function reloadApp(path: string): Promise<void> {
  window.location.href = path;
}
