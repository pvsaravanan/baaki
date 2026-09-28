"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Money } from "@/components/money";
import { ApiError, apiPost } from "@/lib/http";
import { formatINR, toPaise, toRupees } from "@/lib/money";
import { allocateError, removeError } from "@/lib/goal-allocation";
import type { GoalDTO, GoalsSummaryDTO } from "@/lib/types";
import type { GoalsResponse } from "../goal-form";
import { cn } from "@/lib/cn";

export type AllocationMode = "allocate" | "remove";

/**
 * Allocate money to a goal, or remove some of its allocation. Neither is a
 * transaction: the money stays in the accounts, only "available" changes.
 */
export function AllocationModal({
  goal,
  mode,
  summary,
  onClose,
  onDone,
}: {
  goal: GoalDTO;
  mode: AllocationMode;
  summary: GoalsSummaryDTO;
  onClose: () => void;
  onDone: (res: GoalsResponse, message: string) => void;
}) {
  const allocating = mode === "allocate";
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const available = Math.max(0, summary.available);
  const remainingToTarget = Math.max(0, goal.targetAmount - goal.allocatedAmount);
  // One-tap amounts: fill the rest of the target (as far as money allows), or
  // take the whole allocation off.
  const quick = allocating
    ? { label: "Fill to target", paise: Math.min(remainingToTarget, available) }
    : { label: "Remove all", paise: goal.allocatedAmount };

  let parsed: number | null = null;
  try {
    parsed = amount.trim() ? toPaise(amount) : null;
  } catch {
    parsed = null;
  }
  const availableAfter = parsed ? summary.available + (allocating ? -parsed : parsed) : null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (parsed === null) {
      setError("Enter a valid amount");
      return;
    }
    const problem = allocating ? allocateError(parsed, summary.available) : removeError(parsed, goal.allocatedAmount);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    try {
      const res = await apiPost<GoalsResponse>(`/api/goals/${goal.id}/${allocating ? "allocate" : "remove"}`, {
        amount: parsed,
        note: note.trim() || null,
      });
      onDone(res, allocating ? `${formatINR(parsed)} allocated to ${goal.name}` : `${formatINR(parsed)} is available again`);
    } catch (err) {
      setError(err instanceof ApiError ? err.fields?.amount ?? err.message : "Could not save. Please try again.");
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={allocating ? `Allocate to ${goal.name}` : `Remove allocation`}
      description={
        allocating
          ? "Set money aside for this goal. It stays in your accounts — nothing is spent or moved."
          : `Make money set aside for ${goal.name} available again. Your accounts don't change.`
      }
      busy={saving}
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="flex items-center justify-between gap-3 border border-border bg-surface-2 px-4 py-3">
          <span className="text-label-md uppercase text-muted">
            {allocating ? "Available to allocate" : "Allocated to this goal"}
          </span>
          <Money
            paise={allocating ? summary.available : goal.allocatedAmount}
            tone={allocating && summary.available < 0 ? "expense" : "default"}
            className="text-body-lg font-bold"
          />
        </div>

        <div>
          <label htmlFor="alloc-amount" className="block text-xs font-medium text-muted">
            {allocating ? "How much do you want to allocate?" : "How much do you want to remove?"}
          </label>
          <div className="relative mt-1.5">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg font-medium text-muted">₹</span>
            <input
              id="alloc-amount"
              inputMode="decimal"
              autoFocus
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value.replace(/[^0-9.]/g, ""));
                setError(null);
              }}
              placeholder="0"
              aria-invalid={!!error}
              aria-describedby="alloc-help"
              className={cn(
                "tnum w-full rounded-none border bg-surface py-2.5 pl-8 pr-3 text-2xl font-semibold text-fg",
                "focus:outline-none focus:ring-2 focus:ring-ring/30",
                error ? "border-expense" : "border-border",
              )}
            />
          </div>
          <div id="alloc-help" className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            {error ? (
              <p className="text-expense">{error}</p>
            ) : availableAfter !== null ? (
              <p className="text-muted">
                Available after: <Money paise={availableAfter} tone={availableAfter < 0 ? "expense" : "default"} />
              </p>
            ) : (
              <span />
            )}
            {quick.paise > 0 && (
              <button
                type="button"
                onClick={() => {
                  setAmount(String(toRupees(quick.paise)));
                  setError(null);
                }}
                className="text-label-sm uppercase text-accent underline-offset-4 hover:underline"
              >
                {quick.label} · {formatINR(quick.paise)}
              </button>
            )}
          </div>
        </div>

        <Field label="Note" htmlFor="alloc-note" hint="Optional">
          <Input
            id="alloc-note"
            value={note}
            maxLength={200}
            onChange={(e) => setNote(e.target.value)}
            placeholder={allocating ? "e.g. September bonus" : "e.g. Needed for rent"}
          />
        </Field>

        <div className="flex gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" loading={saving} className="flex-1">
            {allocating ? "Allocate" : "Remove allocation"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
