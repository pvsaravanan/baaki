"use client";
import useSWR from "swr";
import type { PageData, PageName } from "@/server/pages";

/**
 * The app's entry point to its on-device "server" (src/server/local-server.ts).
 * The server module — with Prisma and the Postgres engine — is imported on
 * first use, so it stays out of the initial page load and never runs during
 * the static build.
 */
const server = () => import("@/server/local-server");

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
    async () => (await server()).loadPage(name, params),
    { keepPreviousData: true, revalidateOnFocus: false },
  );
  const key = JSON.stringify(params);
  return {
    data: data as PageData<K> | undefined,
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
  await (await server()).eraseEverything();
}
