"use client";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/**
 * A slim back arrow that sits inline before a screen title. On phones the
 * system back gesture is the main way back; this is the visible fallback, so
 * it stays small. The tap area is 40px, and the negative margin lines the
 * arrow up with the page edge. Phones only: the sidebar does this job on
 * larger screens.
 */
export function BackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label="Back"
      className="-ml-2.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-fg transition-colors active:bg-surface-2 md:hidden print:hidden"
    >
      <ArrowLeft aria-hidden className="h-6 w-6" />
    </button>
  );
}
