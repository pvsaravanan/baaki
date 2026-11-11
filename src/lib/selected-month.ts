"use client";
import { useSyncExternalStore } from "react";

/**
 * The month the person last chose, shared by every screen that follows a month
 * (Home, Budget, Reports, Categories, Transactions). Held in memory only: a
 * fresh launch starts on the current month again. Null until a month is picked.
 */
let selected: string | null = null;
const listeners = new Set<() => void>();

export function getSelectedMonth(): string | null {
  return selected;
}

export function setSelectedMonth(key: string): void {
  if (key === selected) return;
  selected = key;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The chosen month ("YYYY-MM"), or null. Null on the server and on the first client render, so it matches the built page. */
export function useSelectedMonth(): string | null {
  return useSyncExternalStore(subscribe, getSelectedMonth, () => null);
}
