import { X } from "lucide-react";
import { Field } from "@/components/ui/field";
import { cn } from "@/lib/cn";

export function TagsInput({
  tags,
  setTags,
  tagInput,
  setTagInput,
  addTag,
}: {
  tags: string[];
  setTags: React.Dispatch<React.SetStateAction<string[]>>;
  tagInput: string;
  setTagInput: (v: string) => void;
  addTag: (value: string) => void;
}) {
  return (
    <Field label="Tags" hint="Press Enter or comma to add.">
      <div className={cn("flex flex-wrap items-center gap-1.5 rounded-none border border-border bg-surface px-2 py-1.5")}>
        {tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded bg-surface-2 px-2 py-0.5 text-xs text-fg">
            {t}
            <button type="button" onClick={() => setTags((prev) => prev.filter((x) => x !== t))} aria-label={`Remove ${t}`}>
              <X className="h-3 w-3 text-faint hover:text-fg" />
            </button>
          </span>
        ))}
        <input
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addTag(tagInput);
            } else if (e.key === "Backspace" && !tagInput && tags.length) {
              setTags((prev) => prev.slice(0, -1));
            }
          }}
          onBlur={() => tagInput && addTag(tagInput)}
          placeholder={tags.length ? "" : "Add a tag…"}
          className="min-w-[80px] flex-1 bg-transparent py-0.5 text-sm text-fg placeholder:text-faint focus:outline-none"
        />
      </div>
    </Field>
  );
}
