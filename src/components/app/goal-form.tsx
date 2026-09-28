"use client";
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { CategoryIconPicker } from "./category-icon-picker";
import { DEFAULT_GOAL_ICON, resolveGoalIcon } from "@/lib/category-icons";
import { DatePicker } from "./date-picker";
import { ApiError, apiPatch, apiPost } from "@/lib/http";
import { toPaise, toRupees } from "@/lib/money";
import { toISODate, fromISODate, formatDate } from "@/lib/dates";
import type { GoalDTO, GoalsSummaryDTO } from "@/lib/types";

export type GoalsResponse = { id?: string; goals: GoalDTO[]; summary: GoalsSummaryDTO };
import { cn } from "@/lib/cn";

export function GoalForm({
  initial,
  onSaved,
  onCancel,
  onBusyChange,
}: {
  initial?: GoalDTO;
  onSaved: (res: GoalsResponse) => void;
  onCancel?: () => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const editing = !!initial;

  const [name, setName] = useState(initial?.name ?? "");
  const [icon, setIcon] = useState<string>(initial ? resolveGoalIcon(initial.icon) : DEFAULT_GOAL_ICON);
  const [targetAmount, setTargetAmount] = useState(
    initial ? String(toRupees(initial.targetAmount)) : "",
  );
  const [targetDate, setTargetDate] = useState(initial?.targetDate ?? "");
  const [targetPickerOpen, setTargetPickerOpen] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => onBusyChange?.(saving), [saving, onBusyChange]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setFormError(null);

    const localErrors: Record<string, string> = {};
    if (!name.trim()) localErrors.name = "Name is required";

    let targetPaise = 0;
    try {
      targetPaise = toPaise(targetAmount);
    } catch {
      localErrors.targetAmount = "Enter a valid amount";
    }
    if (!localErrors.targetAmount && targetPaise <= 0) {
      localErrors.targetAmount = "Target must be greater than zero";
    }

    // Only on create — a goal's target date already having lapsed on an
    // existing, in-progress goal is fine (the user may just be catching up
    // on data entry); creating one already overdue with no warning isn't.
    if (!editing && targetDate && targetDate < toISODate(new Date())) {
      localErrors.targetDate = "Target date can't be in the past";
    }

    if (Object.keys(localErrors).length) {
      setErrors(localErrors);
      return;
    }

    const payload = {
      name: name.trim(),
      icon,
      targetAmount: targetPaise,
      targetDate: targetDate || null,
    };

    setSaving(true);
    try {
      const res = editing
        ? await apiPatch<GoalsResponse>(`/api/goals/${initial!.id}`, payload)
        : await apiPost<GoalsResponse>("/api/goals", payload);
      onSaved(res);
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
        if (err.fields) setErrors(err.fields);
      } else setFormError("Could not save. Please try again.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {formError && (
        <div className="rounded-none border border-expense/30 bg-expense/10 px-3 py-2 text-sm text-expense">
          {formError}
        </div>
      )}

      <Field label="Name" htmlFor="goal-name" error={errors.name} required>
        <Input
          id="goal-name"
          value={name}
          invalid={!!errors.name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Emergency fund, Goa trip"
          autoFocus={!editing}
        />
      </Field>

      <Field label="Icon">
        <CategoryIconPicker value={icon} onChange={setIcon} label="Goal icon" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Target amount" htmlFor="goal-target" error={errors.targetAmount} required className="col-span-2 sm:col-span-1">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted">
              ₹
            </span>
            <Input
              id="goal-target"
              inputMode="decimal"
              value={targetAmount}
              invalid={!!errors.targetAmount}
              onChange={(e) => setTargetAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="0"
              className="pl-7"
            />
          </div>
        </Field>

        <Field label="Target date" htmlFor="goal-date" hint="Optional" error={errors.targetDate} className="col-span-2 sm:col-span-1">
          <div className="relative">
            <button
              type="button"
              id="goal-date"
              onClick={() => setTargetPickerOpen((o) => !o)}
              aria-haspopup="true"
              aria-expanded={targetPickerOpen}
              className={cn(
                "flex w-full items-center justify-between rounded-none border bg-surface px-4 py-3 text-left text-[16px] transition-colors focus:outline-none focus:ring-2 focus:ring-ring/25 sm:text-body-md",
                errors.targetDate ? "border-expense focus:border-expense" : "border-border focus:border-brand",
                targetDate ? "text-fg" : "text-faint",
              )}
            >
              {targetDate ? formatDate(fromISODate(targetDate) ?? new Date()) : "No target date"}
              <ChevronDown className="h-4 w-4 shrink-0 text-muted" />
            </button>
            <DatePicker
              open={targetPickerOpen}
              onClose={() => setTargetPickerOpen(false)}
              value={targetDate || null}
              minDate={editing ? undefined : toISODate(new Date())}
              title="Target date"
              onClear={() => setTargetDate("")}
              onSelect={(iso) => {
                setTargetDate(iso);
                setTargetPickerOpen(false);
              }}
            />
          </div>
        </Field>
      </div>

      <div className="flex gap-2 pt-1">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={saving} className="flex-1">
            Cancel
          </Button>
        )}
        <Button type="submit" loading={saving} className="flex-1">
          {editing ? "Save changes" : "Create goal"}
        </Button>
      </div>
    </form>
  );
}
