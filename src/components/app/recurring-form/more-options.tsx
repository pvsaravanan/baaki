"use client";
import { CalendarOff, ChevronDown, ChevronRight, ChevronUp, Pause, SlidersHorizontal, Zap } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/ui/cn";
import { FieldError, CARD, VALUE, dateLabel } from "./parts";

export function MoreOptions({
  open,
  onToggle,
  endDate,
  endError,
  onPickEnd,
  autoPost,
  onAutoPost,
  isActive,
  onActive,
}: {
  open: boolean;
  onToggle: () => void;
  endDate: string;
  endError?: string;
  onPickEnd: () => void;
  autoPost: boolean;
  onAutoPost: (on: boolean) => void;
  isActive: boolean;
  onActive: (on: boolean) => void;
}) {
  return (
    <section className={cn(CARD, "border-border")}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 p-3 text-left text-base font-bold text-fg"
      >
        <span className="flex w-8 shrink-0 justify-center">
          <SlidersHorizontal aria-hidden className="h-6 w-6" />
        </span>
        <span className="min-w-0 flex-1">More options</span>
        {open ? <ChevronUp aria-hidden className="h-5 w-5" /> : <ChevronDown aria-hidden className="h-5 w-5" />}
      </button>
      {open && (
        <div className="divide-y divide-border/15 border-t border-border/15">
          <div className="px-3 py-3">
            <button type="button" onClick={onPickEnd} className="flex w-full items-center gap-2.5 text-left">
              <span className="flex w-8 shrink-0 justify-center text-fg">
                <CalendarOff aria-hidden className="h-6 w-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-fg">End date</span>
                <span className={cn("block", VALUE, endDate ? "text-fg" : "text-muted")}>{endDate ? dateLabel(endDate) : "No end date"}</span>
              </span>
              <ChevronRight aria-hidden className="h-5 w-5 shrink-0 text-fg" />
            </button>
            <FieldError message={endError} />
          </div>
          <div className="flex items-start gap-2.5 px-3 py-3">
            <span className="flex w-8 shrink-0 justify-center text-fg">
              <Zap aria-hidden className="h-6 w-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-fg">Add automatically when due</span>
              <span className="mt-0.5 block text-xs text-muted">
                On: the app adds each payment on its date for you. Off: the app only reminds you, and you add it with one tap.
              </span>
            </span>
            <Switch checked={autoPost} onChange={onAutoPost} label="Add automatically when due" />
          </div>
          <div className="flex items-start gap-2.5 px-3 py-3">
            <span className="flex w-8 shrink-0 justify-center text-fg">
              <Pause aria-hidden className="h-6 w-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-fg">Active</span>
              <span className="mt-0.5 block text-xs text-muted">
                Off: paused. Nothing is added and no reminders show, but it isn&apos;t deleted.
              </span>
            </span>
            <Switch checked={isActive} onChange={onActive} label="Active" />
          </div>
        </div>
      )}
    </section>
  );
}
