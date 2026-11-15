"use client";
import { useState } from "react";
import { Check, ChevronDown, ChevronRight, ChevronUp, Plus, Repeat, SlidersHorizontal, StickyNote, Tag, X } from "lucide-react";
import { SelectMenu } from "@/components/ui/select-menu";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/ui/cn";
import { FREQUENCIES, FREQUENCY_LABELS, type Frequency } from "@/lib/constants";
import { formatDate, formatRelativeDay, fromISODate } from "@/lib/dates";

const ROW = "flex w-full items-center gap-3 rounded-lg border bg-surface px-3.5 py-3 text-left text-body-sm transition-colors";

export function Stepper() {
  return (
    <ol aria-label="Step 2 of 2" className="mb-2 flex items-start justify-center px-8">
      <li className="flex w-20 flex-col items-center gap-1 text-label-lg text-fg">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-brand-fg">
          <Check className="h-4 w-4" strokeWidth={3} />
        </span>
        <span className="font-medium">Amount</span>
      </li>
      <li aria-hidden className="mt-4 h-0.5 flex-1 bg-brand" />
      <li aria-current="step" className="flex w-20 flex-col items-center gap-1 text-label-lg text-fg">
        <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-brand bg-surface">2</span>
        <span className="font-medium">Details</span>
      </li>
    </ol>
  );
}

function RowText({ icon, label, value, placeholder }: { icon: React.ReactNode; label: string; value?: string; placeholder?: string }) {
  return (
    <>
      <span className="flex w-7 shrink-0 justify-center text-fg">{icon}</span>
      <span className="shrink-0 font-bold text-fg">{label}</span>
      <span className={cn("min-w-0 flex-1 truncate text-right", value ? "text-fg" : "text-muted")}>{value ?? placeholder}</span>
      <ChevronRight className="h-5 w-5 shrink-0 text-fg" />
    </>
  );
}

export function DetailRow({
  icon,
  label,
  value,
  placeholder,
  error,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  placeholder?: string;
  error?: string;
  onClick: () => void;
}) {
  return (
    <div>
      <button type="button" onClick={onClick} className={cn(ROW, error ? "border-expense" : "border-border/20")}>
        <RowText icon={icon} label={label} value={value} placeholder={placeholder} />
      </button>
      {error && <p className="mt-1 text-body-sm text-expense">{error}</p>}
    </div>
  );
}

export function dateLabel(date: string): string {
  const parsed = fromISODate(date);
  if (!parsed) return date;
  const relative = formatRelativeDay(parsed, new Date());
  return relative === "Today" || relative === "Yesterday" ? `${relative}, ${formatDate(parsed)}` : formatDate(parsed);
}

export function MoreDetails({
  open,
  onToggle,
  canRepeat,
  recurring,
  onRecurring,
  frequency,
  onFrequency,
  notes,
  onNotes,
  tags,
  onTags,
}: {
  open: boolean;
  onToggle: () => void;
  /** The Recurring switch: only when adding. */
  canRepeat: boolean;
  recurring: boolean;
  onRecurring: (v: boolean) => void;
  frequency: Frequency;
  onFrequency: (v: Frequency) => void;
  notes: string;
  onNotes: (v: string) => void;
  tags: string[];
  onTags: (v: string[]) => void;
}) {
  return (
    <div className={cn("mt-1 overflow-hidden rounded-lg border", open ? "border-brand-soft" : "border-border/20")}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={cn("flex w-full items-center gap-3 px-3.5 py-3 text-left text-body-sm font-bold text-fg", open && "bg-brand-soft")}
      >
        {open && <SlidersHorizontal className="h-5 w-5 shrink-0" />}
        <span className="flex-1">More details</span>
        {open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </button>

      {open && (
        <div className="divide-y divide-border/10 text-body-sm">
          {canRepeat && (
            <div className="flex items-center gap-3 px-3.5 py-2.5">
              <Repeat className="h-5 w-5 shrink-0 text-fg" />
              <span className="flex-1 font-bold text-fg">Recurring</span>
              <Switch checked={recurring} onChange={onRecurring} label="Recurring" />
            </div>
          )}
          {canRepeat && recurring && (
            <div className="flex items-center gap-3 px-3.5 py-2.5">
              <span className="w-5 shrink-0" />
              <span className="flex-1 text-muted">Repeats</span>
              <SelectMenu
                size="sm"
                ariaLabel="How often it repeats"
                value={frequency}
                onChange={(v) => onFrequency(v as Frequency)}
                options={FREQUENCIES.map((f) => ({ value: f, label: FREQUENCY_LABELS[f] }))}
                className="w-36"
              />
            </div>
          )}
          <div className="flex gap-3 px-3.5 py-2.5">
            <StickyNote className="mt-2 h-5 w-5 shrink-0 text-fg" />
            <label className="flex-1 rounded-lg border border-border/20 px-3 py-2 focus-within:border-brand">
              <span className="block font-bold text-fg">Note</span>
              <textarea
                value={notes}
                onChange={(e) => onNotes(e.target.value)}
                maxLength={1000}
                rows={1}
                placeholder="Add a note..."
                className="mt-0.5 block w-full resize-none bg-transparent text-fg placeholder:text-muted focus:outline-none"
              />
            </label>
          </div>
          <TagsRow tags={tags} onTags={onTags} />
        </div>
      )}
    </div>
  );
}

function TagsRow({ tags, onTags }: { tags: string[]; onTags: (v: string[]) => void }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const commit = () => {
    const tag = draft.trim();
    if (tag && !tags.includes(tag) && tags.length < 20) onTags([...tags, tag]);
    setDraft("");
  };

  return (
    <div className="flex items-start gap-3 px-3.5 py-2.5">
      <Tag className="mt-1 h-5 w-5 shrink-0 text-fg" />
      <span className="mt-1 font-bold text-fg">Tags</span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        {tags.map((t) => (
          <span key={t} className="inline-flex max-w-full items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-fg">
            <span className="truncate">{t}</span>
            <button type="button" onClick={() => onTags(tags.filter((x) => x !== t))} aria-label={`Remove ${t}`}>
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
        {adding ? (
          <input
            autoFocus
            value={draft}
            maxLength={40}
            enterKeyHint="done"
            aria-label="New tag"
            placeholder="Tag name"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                commit();
              }
            }}
            onBlur={() => {
              commit();
              setAdding(false);
            }}
            className="w-24 rounded-full border border-border/20 bg-transparent px-2.5 py-1 text-fg placeholder:text-muted focus:border-brand focus:outline-none"
          />
        ) : (
          <button type="button" onClick={() => setAdding(true)} aria-label="Add tag" className="p-1 text-fg">
            <Plus className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}

