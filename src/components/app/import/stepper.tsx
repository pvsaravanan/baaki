import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { STEPS, type Step } from "./types";

export function Stepper({ current }: { current: Step }) {
  return (
    <ol className="flex items-center gap-2 overflow-x-auto text-sm">
      {STEPS.map((s, i) => {
        const state = s.n < current ? "done" : s.n === current ? "active" : "todo";
        return (
          <li key={s.n} className="flex items-center gap-2">
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
                "whitespace-nowrap",
                state === "todo" ? "text-faint" : "font-medium text-fg",
              )}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-border sm:w-10" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}
