"use client";
import { Check } from "lucide-react";
import { Sheet } from "../sheet";

export function PickerSheet({
  open,
  title,
  onClose,
  selected,
  options,
  onPick,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  selected: string;
  options: { id: string; label: string; meta?: string }[];
  onPick: (id: string) => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="max-h-[60dvh] overflow-y-auto overscroll-contain">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => {
              onPick(o.id);
              onClose();
            }}
            className="flex w-full items-center gap-3 border-b border-border/10 py-3 text-left text-body-sm text-fg"
          >
            <span className="min-w-0 flex-1 truncate font-medium">{o.label}</span>
            {o.meta && <span className="tnum text-muted">{o.meta}</span>}
            {o.id === selected && <Check className="h-5 w-5 shrink-0 text-brand-hover" />}
          </button>
        ))}
        {options.length === 0 && <p className="py-3 text-body-sm text-muted">Nothing to choose from yet.</p>}
      </div>
    </Sheet>
  );
}

