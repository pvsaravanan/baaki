"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CreditCard,
  Delete,
  PenLine,
  Pencil,
  Plus,
  Repeat,
  SlidersHorizontal,
  StickyNote,
  Tag,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { SelectMenu } from "@/components/ui/select-menu";
import { Switch } from "@/components/ui/switch";
import {
  amountProblemMessage,
  displayAmount,
  displayExpression,
  evaluateAmount,
  hasOperator,
  OPERATORS,
  pressAmountKey,
  type AmountKey,
  type AmountOperator,
} from "@/lib/amount-keypad";
import { suggestCategoryKey } from "@/lib/categorize";
import { cn } from "@/lib/cn";
import { FREQUENCIES, FREQUENCY_LABELS, type Frequency, type TransactionType } from "@/lib/constants";
import { formatDate, formatRelativeDay, fromISODate, toISODate } from "@/lib/dates";
import { ApiError, apiPatch, apiPost } from "@/lib/http";
import { formatINR, toRupees } from "@/lib/money";
import type { CategoryDTO, TransactionDTO } from "@/lib/types";
import { useAppData } from "../app-data";
import { CategoryIcon } from "../category-icon";
import { QuickCategoryModal } from "../quick-category-modal";
import { DatePickerSheet } from "../date-picker-sheet";
import { Sheet } from "../sheet";
import { CategoryPickerSheet } from "./category-picker-sheet";
import { TYPE_OPTIONS } from "./types";

const TYPE_ICONS = { expense: ArrowDownRight, income: ArrowUpRight, transfer: ArrowLeftRight };
const KEYS: AmountKey[] = ["1", "2", "3", "÷", "4", "5", "6", "×", "7", "8", "9", "−", ".", "0", "backspace", "+"];
const KEY_LABELS: Partial<Record<AmountKey, string>> = {
  backspace: "Delete last digit",
  "+": "Add",
  "−": "Subtract",
  "×": "Multiply",
  "÷": "Divide",
};
/** What a computer keyboard types for each operator. */
const KEYBOARD_OPERATORS: Record<string, AmountOperator> = { "+": "+", "-": "−", "−": "−", "*": "×", x: "×", X: "×", "×": "×", "/": "÷", "÷": "÷" };
const ROW = "flex w-full items-center gap-3 rounded-lg border bg-surface px-3.5 py-3 text-left text-body-sm transition-colors";

type Picker = "category" | "date" | "account" | "toAccount" | null;

/**
 * Adding a transaction, in two steps: the amount on a keypad (with the type and
 * a description), then the details, most of them already filled in.
 *
 * Editing one (`initial`) opens on the details, everything filled in; the
 * amount card's pencil goes to the keypad and back.
 */
export function AddTransactionFlow({
  initial,
  prefillDate,
  onSaved,
  onClose,
}: {
  initial?: TransactionDTO;
  prefillDate?: string;
  onSaved: (txn: TransactionDTO) => void;
  onClose: () => void;
}) {
  const { accounts, categories, preference } = useAppData();
  const liveAccounts = useMemo(() => accounts.filter((a) => !a.isArchived), [accounts]);
  const editing = !!initial;

  const [step, setStep] = useState<1 | 2>(editing ? 2 : 1);
  const [type, setType] = useState<TransactionType>(initial?.type ?? "expense");
  const [amount, setAmount] = useState(initial ? String(toRupees(initial.amount)) : "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [pickedCategoryId, setPickedCategoryId] = useState(initial?.categoryId ?? "");
  const [date, setDate] = useState(initial?.date ?? prefillDate ?? toISODate(new Date()));
  const [accountId, setAccountId] = useState(
    () => initial?.accountId ?? liveAccounts.find((a) => a.id === preference.defaultAccountId)?.id ?? liveAccounts[0]?.id ?? "",
  );
  const [transferAccountId, setTransferAccountId] = useState(initial?.transferAccountId ?? "");
  const [moreOpen, setMoreOpen] = useState(!!initial && (!!initial.notes || initial.tags.length > 0));
  const [recurring, setRecurring] = useState(false);
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);

  const [picker, setPicker] = useState<Picker>(null);
  const [newCategoryOpen, setNewCategoryOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isTransfer = type === "transfer";
  // `amount` is what was typed, which may be a sum; this is what it comes to.
  const { paise } = evaluateAmount(amount);

  const eligibleCategories = useMemo(() => {
    const wantIncome = type === "income";
    // A category since switched off still shows for the entry being edited that has it.
    return categories.filter(
      (c) => (c.isActive || c.id === initial?.categoryId) && (c.kind === "both" || (c.kind === "income") === wantIncome),
    );
  }, [categories, type, initial?.categoryId]);

  // A category picked by hand wins; until then one follows from the description.
  const categoryId = useMemo(() => {
    if (isTransfer) return "";
    if (pickedCategoryId) return pickedCategoryId;
    const key = suggestCategoryKey(description.trim());
    return eligibleCategories.find((c) => key && c.systemKey === key)?.id ?? "";
  }, [isTransfer, pickedCategoryId, description, eligibleCategories]);
  const category = categories.find((c) => c.id === categoryId);

  const changeType = (next: TransactionType) => {
    setType(next);
    const picked = categories.find((c) => c.id === pickedCategoryId);
    const fits = picked && picked.kind !== (next === "income" ? "expense" : "income");
    if (next === "transfer" || !fits) setPickedCategoryId("");
  };

  const goToDetails = useCallback(() => {
    if (paise <= 0) return;
    if (!description.trim()) {
      setErrors({ description: "Add a description" });
      return;
    }
    setErrors({});
    setFormError(null);
    setStep(2);
  }, [paise, description]);

  // Adding, back goes to the amount from the details, and leaves from the
  // amount; editing, the other way round. Kept stable for Modal (its setup
  // re-runs when onClose changes).
  const stepRef = useRef(step);
  stepRef.current = step;
  const goBack = useCallback(() => {
    const first = editing ? 2 : 1;
    if (stepRef.current !== first) setStep(first);
    else onClose();
  }, [onClose, editing]);

  const rootRef = useRef<HTMLDivElement>(null);
  // In braces: newer browsers return a promise from scrollTo, and React would
  // try to call whatever an effect returns as its cleanup.
  useEffect(() => {
    rootRef.current?.parentElement?.scrollTo(0, 0);
  }, [step]);

  async function save() {
    const found: Record<string, string> = {};
    if (!accountId) found.accountId = "Choose an account";
    if (!isTransfer && !categoryId) found.categoryId = "Choose a category";
    if (isTransfer && (!transferAccountId || transferAccountId === accountId)) {
      found.transferAccountId = "Choose a different account";
    }
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length) return;

    setSaving(true);
    const fields = {
      type,
      amount: paise,
      description: description.trim(),
      date,
      categoryId: isTransfer ? null : categoryId,
      accountId,
      transferAccountId: isTransfer ? transferAccountId : null,
      notes: notes.trim() || null,
      tags,
    };
    try {
      // Repeating is set up only when adding (an update leaves it alone).
      const res = initial
        ? await apiPatch<{ transaction: TransactionDTO }>(`/api/transactions/${initial.id}`, fields)
        : await apiPost<{ transaction: TransactionDTO }>("/api/transactions", { ...fields, repeat: recurring ? frequency : null });
      onSaved(res.transaction);
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
        if (err.fields) setErrors(err.fields);
      } else setFormError("Could not save. Please try again.");
      setSaving(false);
    }
  }

  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name;
  const typeLabel = TYPE_OPTIONS.find((o) => o.value === type)!.label;

  return (
    <Modal open fullScreen onClose={goBack} title={editing ? "Edit transaction" : "Add transaction"} busy={saving}>
      <div ref={rootRef} className="flex min-h-full flex-col">
        <header className="sticky top-0 z-10 flex items-center gap-3 bg-surface px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:pt-3">
          <button type="button" onClick={goBack} disabled={saving} aria-label="Back" className="-ml-1 p-1 text-fg disabled:opacity-50">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h2 className="text-headline-sm tracking-normal text-fg">{editing ? "Edit Transaction" : "Add Transaction"}</h2>
        </header>

        {step === 1 ? (
          <AmountStep
            type={type}
            onType={changeType}
            amount={amount}
            onAmount={setAmount}
            description={description}
            onDescription={(v) => {
              setDescription(v);
              setErrors({});
            }}
            descriptionError={errors.description}
            category={category}
            canContinue={paise > 0}
            onNext={goToDetails}
            nextLabel={editing ? "Done" : "Next"}
          />
        ) : (
          <div className={cn("flex flex-1 flex-col gap-2.5 px-4 pb-4", editing && "pt-1")}>
            {!editing && <Stepper />}

            <div className="mb-1 flex items-center gap-3 rounded-xl bg-brand-soft/60 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="tnum text-headline-md text-fg">{formatINR(paise)}</p>
                <p className="truncate text-body-sm text-muted">
                  {typeLabel} · {description.trim()}
                </p>
              </div>
              <button type="button" onClick={() => setStep(1)} disabled={saving} aria-label="Edit amount" className="p-2 text-fg">
                <Pencil className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <p role="alert" className="rounded-lg border border-expense/30 bg-expense/10 px-3 py-2 text-body-sm text-expense">
                {formError}
              </p>
            )}

            {!isTransfer && (
              <DetailRow
                icon={category ? <CategoryIcon icon={category.icon} size={24} /> : <Tag className="h-5 w-5" />}
                label="Category"
                value={category?.name}
                placeholder="Choose"
                error={errors.categoryId}
                onClick={() => setPicker("category")}
              />
            )}
            <DetailRow icon={<CalendarDays className="h-5 w-5" />} label="Date" value={dateLabel(date)} onClick={() => setPicker("date")} />
            <DetailRow
              icon={<CreditCard className="h-5 w-5" />}
              label={isTransfer ? "From account" : "Account"}
              value={accountName(accountId)}
              placeholder="Choose"
              error={errors.accountId}
              onClick={() => setPicker("account")}
            />
            {isTransfer && (
              <DetailRow
                icon={<ArrowLeftRight className="h-5 w-5" />}
                label="To account"
                value={accountName(transferAccountId)}
                placeholder="Choose"
                error={errors.transferAccountId}
                onClick={() => setPicker("toAccount")}
              />
            )}

            <MoreDetails
              open={moreOpen}
              onToggle={() => setMoreOpen((o) => !o)}
              canRepeat={!editing}
              recurring={recurring}
              onRecurring={setRecurring}
              frequency={frequency}
              onFrequency={setFrequency}
              notes={notes}
              onNotes={setNotes}
              tags={tags}
              onTags={setTags}
            />
          </div>
        )}

        {step === 2 && (
          <footer className="sticky bottom-0 mt-auto bg-surface px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 sm:pb-4">
            <Button size="lg" loading={saving} onClick={save} className="w-full !rounded-lg">
              {editing ? "Save changes" : "Add Transaction"}
            </Button>
          </footer>
        )}
      </div>

      <CategoryPickerSheet
        open={picker === "category"}
        onClose={() => setPicker(null)}
        categories={eligibleCategories}
        selected={categoryId}
        onPick={(id) => {
          setPickedCategoryId(id);
          setErrors((e) => ({ ...e, categoryId: "" }));
        }}
        onCreateNew={() => setNewCategoryOpen(true)}
      />
      <DatePickerSheet
        open={picker === "date"}
        date={date}
        max={toISODate(new Date())}
        subtitle="Choose the date for this transaction."
        onClose={() => setPicker(null)}
        onPick={setDate}
      />
      <PickerSheet
        open={picker === "account"}
        title={isTransfer ? "From account" : "Account"}
        onClose={() => setPicker(null)}
        selected={accountId}
        options={liveAccounts.map((a) => ({ id: a.id, label: a.name, meta: formatINR(a.balance) }))}
        onPick={(id) => {
          setAccountId(id);
          if (id === transferAccountId) setTransferAccountId("");
          setErrors((e) => ({ ...e, accountId: "" }));
          setFormError(null); // it may be about the account just replaced
        }}
      />
      <PickerSheet
        open={picker === "toAccount"}
        title="To account"
        onClose={() => setPicker(null)}
        selected={transferAccountId}
        options={liveAccounts.filter((a) => a.id !== accountId).map((a) => ({ id: a.id, label: a.name, meta: formatINR(a.balance) }))}
        onPick={(id) => {
          setTransferAccountId(id);
          setErrors((e) => ({ ...e, transferAccountId: "" }));
        }}
      />
      <QuickCategoryModal
        open={newCategoryOpen}
        onClose={() => setNewCategoryOpen(false)}
        defaultKind={type === "income" ? "income" : "expense"}
        onCreated={(c) => setPickedCategoryId(c.id)}
      />
    </Modal>
  );
}

function AmountStep({
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
              onClick={() => onAmount((prev) => pressAmountKey(prev, key))}
              className={cn(
                "flex h-[60px] items-center justify-center rounded-lg border border-border/20 text-headline-md text-fg transition-colors active:bg-brand-soft",
                key === "backspace" ? "bg-surface-2" : (OPERATORS as readonly string[]).includes(key) ? "bg-brand-soft/60" : "bg-surface",
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

function Stepper() {
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

function DetailRow({
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

function dateLabel(date: string): string {
  const parsed = fromISODate(date);
  if (!parsed) return date;
  const relative = formatRelativeDay(parsed, new Date());
  return relative === "Today" || relative === "Yesterday" ? `${relative}, ${formatDate(parsed)}` : formatDate(parsed);
}

function MoreDetails({
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
