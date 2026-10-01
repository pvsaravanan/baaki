"use client";
import { createContext, useCallback, useContext } from "react";
import { useSWRConfig } from "swr";
import type { AccountDTO, CategoryDTO, ContactDTO, GoalMoneyDTO, PreferenceDTO, TagDTO } from "@/lib/types";

export interface AppData {
  user: { id: string; name: string; email: string; avatarUrl: string | null };
  accounts: AccountDTO[];
  categories: CategoryDTO[];
  tags: TagDTO[];
  contacts: ContactDTO[];
  preference: PreferenceDTO;
  goalMoney: GoalMoneyDTO;
  /** Re-read every screen's data from the device after a change. */
  refresh: () => void;
}

const AppDataContext = createContext<AppData | null>(null);

export function AppDataProvider({
  value,
  children,
}: {
  value: Omit<AppData, "refresh">;
  children: React.ReactNode;
}) {
  const { mutate } = useSWRConfig();

  // Every screen's data (usePageData) and the shell's own data are SWR
  // entries, so revalidating them all re-reads the database IN PLACE. Passing
  // `undefined` as the data would clear every entry first, throwing away any
  // optimistic update and flashing a loading state; a matcher-only mutate
  // re-fetches while keeping the current values shown.
  const refresh = useCallback(() => {
    mutate(() => true);
  }, [mutate]);

  return (
    <AppDataContext.Provider value={{ ...value, refresh }}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData(): AppData {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}

/** Convenience lookups. */
export function useLookups() {
  const { accounts, categories } = useAppData();
  const accountName = (id: string | null) => accounts.find((a) => a.id === id)?.name ?? "—";
  const category = (id: string | null) => categories.find((c) => c.id === id) ?? null;
  return { accountName, category };
}
