import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { STEPS, type Step } from "./types";

/**
 * Always fits on one line — no sideways scrolling. On phones only the current
 * step is named (the others show their number); wider screens name them all.
 */
export function Stepper({ current }: { current: Step }) {
  return (
    <ol className="flex min-w-0 items-center gap-1.5 text-sm sm:gap-2">
      {STEPS.map((s, i) => {
        const state = s.n < current ? "done" : s.n === current ? "active" : "todo";
        return (
          <li
            key={s.n}
            aria-current={state === "active" ? "step" : undefined}
            className={cn("flex items-center gap-1.5 sm:gap-2", state === "active" && "min-w-0")}
          >
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-none text-2xs font-semibold transition-colors",
                state === "active" && "bg-brand text-brand-fg",
                state === "done" && "bg-brand-soft text-brand-hover",
                state === "todo" && "bg-surface-2 text-faint",
              )}
            >
              {state === "done" ? <CheckCircle2 className="h-3.5 w-3.5" /> : s.n}
            </span>
            <span
              className={cn(
                "min-w-0 truncate",
                state === "todo" ? "text-faint" : "font-medium text-fg",
                // Phones: name only the current step; the rest are numbers
                // (their names stay available to screen readers).
                state !== "active" && "sr-only sm:not-sr-only",
              )}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && <span className="mx-0.5 h-px w-4 shrink-0 bg-border sm:mx-1 sm:w-10" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}
