"use client";
import { useEffect, useRef } from "react";
import { ArrowDownRight, ArrowLeftRight, ArrowRight, ArrowUpRight, Check, Delete, PenLine, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { amountProblemMessage, displayAmount, displayExpression, evaluateAmount, hasOperator, OPERATORS, pressAmountKey, type AmountKey, type AmountOperator } from "@/lib/money/amount-keypad";
import { cn } from "@/lib/ui/cn";
import { type TransactionType } from "@/lib/constants";
import { formatINR } from "@/lib/money/money";
import type { CategoryDTO } from "@/lib/types";
import { CategoryIcon } from "../category-icon";
import { TYPE_OPTIONS } from "./types";

const TYPE_ICONS = { expense: ArrowDownRight, income: ArrowUpRight, transfer: ArrowLeftRight };
const KEYS: AmountKey[] = ["1", "2", "3", "÷", "4", "5", "6", "×", "7", "8", "9", "−", ".", "0", "backspace", "+", "="];
const KEY_LABELS: Partial<Record<AmountKey, string>> = {
  backspace: "Delete last digit",
  "+": "Add",
  "−": "Subtract",
  "×": "Multiply",
  "÷": "Divide",
  "=": "Equals: work out the sum",
};
/** What a computer keyboard types for each operator ("=" is handled on its own). */
const KEYBOARD_OPERATORS: Record<string, AmountOperator> = { "+": "+", "-": "−", "−": "−", "*": "×", x: "×", X: "×", "×": "×", "/": "÷", "÷": "÷" };

export function AmountStep({
  type,
  onType,
  amount,
  onAmount,
  description,
  onDescription,
  descriptionError,
  category,
  canContinue,
  onNext,
  nextLabel,
}: {
  type: TransactionType;
  onType: (t: TransactionType) => void;
  amount: string;
  onAmount: (update: (prev: string) => string) => void;
  description: string;
  onDescription: (v: string) => void;
  descriptionError?: string;
  category?: CategoryDTO;
  canContinue: boolean;
  onNext: () => void;
  nextLabel: string;
}) {
  const descriptionRef = useRef<HTMLInputElement>(null);

  // On a computer, typing works as well as the on-screen keypad does.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el?.tagName === "INPUT" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^[0-9.]$/.test(e.key)) {
        e.preventDefault();
        onAmount((prev) => pressAmountKey(prev, e.key as AmountKey));
      } else if (e.key === "=") {
        e.preventDefault();
        onAmount((prev) => pressAmountKey(prev, "="));
      } else if (KEYBOARD_OPERATORS[e.key]) {
        e.preventDefault();
        onAmount((prev) => pressAmountKey(prev, KEYBOARD_OPERATORS[e.key]));
      } else if (e.key === "Backspace") {
        e.preventDefault();
        onAmount((prev) => pressAmountKey(prev, "backspace"));
      } else if (e.key === "Enter") {
        e.preventDefault();
        onNext();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onAmount, onNext]);

  useEffect(() => {
    if (descriptionError) descriptionRef.current?.focus();
  }, [descriptionError]);

  const isSum = hasOperator(amount);
  const { paise, problem } = evaluateAmount(amount);
  // A result that can't be worked out or stored has no sensible number to show.
  const shown = !isSum ? `₹${displayAmount(amount)}` : problem && problem !== "negative" ? "—" : formatINR(paise);

  return (
    <>
      <div className="flex flex-1 flex-col gap-5 px-4 pb-4 pt-1">
        <div role="radiogroup" aria-label="Transaction type" className="flex gap-2">
          {TYPE_OPTIONS.map(({ value, label }) => {
            const Icon = TYPE_ICONS[value];
            const active = value === type;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onType(value)}
                className={cn(
                  "flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full border border-border text-[13px] font-bold transition-colors",
                  active ? "bg-brand text-brand-fg" : "bg-surface text-fg",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </button>
            );
          })}
        </div>

        <div className="relative" role="status" aria-label={isSum ? `${displayExpression(amount)} equals ${shown}` : `Amount ${shown}`}>
          {/* Keeps its height when empty, so the keypad doesn't move on the first operator. */}
          <p className="tnum min-h-6 break-words text-center text-body-md text-muted">
            {isSum && <>{displayExpression(amount)}</>}
          </p>
          <div
            className={cn(
              "tnum flex items-center justify-center py-1 font-extrabold tracking-tight",
              problem ? "text-expense" : "text-fg",
              shown.length > 12 ? "text-[34px]" : shown.length > 8 ? "text-[44px]" : "text-[56px]",
            )}
          >
            <span className={cn(!amount && "text-faint")}>{shown}</span>
            {!isSum && <span aria-hidden className="ml-1 h-[1em] w-0.5 animate-pulse bg-brand" />}
          </div>
          {/* Floats in the gap below: "10 ÷ 0" shows this on the way to "10 ÷ 0.5", and the keys mustn't jump mid-typing. */}
          {problem && <p className="absolute inset-x-0 top-full text-center text-body-sm text-expense">{amountProblemMessage(problem)}</p>}
        </div>

        <div className="flex flex-col items-center gap-1">
          <div className={cn("flex max-w-full items-center gap-2 rounded-full bg-surface-2 px-4 py-2", descriptionError && "ring-1 ring-expense")}>
            {category ? <CategoryIcon icon={category.icon} size={20} /> : <PenLine className="h-4 w-4 shrink-0 text-muted" />}
            <input
              ref={descriptionRef}
              value={description}
              onChange={(e) => onDescription(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onNext();
                }
              }}
              maxLength={200}
              enterKeyHint="next"
              aria-label="Description"
              aria-invalid={!!descriptionError}
              placeholder={type === "transfer" ? "Move to savings" : "Add a description"}
              size={Math.max(description.length, 17) + 1}
              className="min-w-0 max-w-full bg-transparent text-body-sm text-fg placeholder:text-muted focus:outline-none"
            />
            {description && (
              <button
                type="button"
                aria-label="Clear description"
                onClick={() => {
                  onDescription("");
                  descriptionRef.current?.focus();
                }}
                className="shrink-0 text-fg"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {descriptionError && <p className="text-body-sm text-expense">{descriptionError}</p>}
        </div>

        <div className="grid grid-cols-4 gap-2.5">
          {KEYS.map((key) => (
            <button
              key={key}
              type="button"
              aria-label={KEY_LABELS[key]}
              // "=" has a sum to work out only once there is an operator in it.
              disabled={key === "=" && !isSum}
              onClick={() => onAmount((prev) => pressAmountKey(prev, key))}
              className={cn(
                "flex h-[60px] items-center justify-center rounded-lg border border-border/20 text-headline-md text-fg transition-colors active:bg-brand-soft disabled:opacity-40",
                key === "=" && "col-span-4",
                key === "backspace" ? "bg-surface-2" : key === "=" || (OPERATORS as readonly string[]).includes(key) ? "bg-brand-soft/60" : "bg-surface",
              )}
            >
              {key === "backspace" ? <Delete className="h-6 w-6" /> : key}
            </button>
          ))}
        </div>
      </div>

      <footer className="sticky bottom-0 mt-auto bg-surface px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 sm:pb-4">
        <Button size="lg" disabled={!canContinue} onClick={onNext} className="w-full !rounded-lg">
          {nextLabel}
          {nextLabel === "Next" ? <ArrowRight className="h-5 w-5" /> : <Check className="h-5 w-5" />}
        </Button>
      </footer>
    </>
  );
}

