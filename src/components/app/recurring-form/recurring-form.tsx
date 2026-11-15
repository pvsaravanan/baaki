"use client";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowLeftRight, Coins, LayoutGrid, Tag, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppData } from "../app-data";
import { CategoryIcon } from "../category-icon";
import { DatePickerSheet } from "../date-picker-sheet";
import { RepeatCalendar } from "../repeat-calendar";
import { CategoryPickerSheet } from "../transaction-form/category-picker-sheet";
import { PickerSheet } from "../transaction-form/picker-sheet";
import { ApiError, apiPatch, apiPost } from "@/lib/request/http";
import { toISODate } from "@/lib/dates";
import { formatINR, toPaise, toRupees } from "@/lib/money/money";
import { QuickCategoryModal } from "../quick-category-modal";
import { type Frequency } from "@/lib/constants";
import type { RecurringDTO } from "@/lib/types";
import { cn } from "@/lib/ui/cn";
import { RepeatSection } from "./repeat-section";
import { MoreOptions } from "./more-options";
import { type Picker, type RecurringType, TYPE_OPTIONS, MAX_INTERVAL, CARD, VALUE, Required, FieldError, PickerRow, isQuick } from "./parts";

export function RecurringForm({
  initial,
  onSaved,
  onCancel,
  onBusyChange,
}: {
  initial?: RecurringDTO;
  onSaved: (list: RecurringDTO[]) => void;
  onCancel: () => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const { accounts, categories, preference } = useAppData();
  const editing = !!initial;

  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<RecurringType>(initial?.type ?? "expense");
  const [amount, setAmount] = useState(initial ? String(toRupees(initial.amount)) : "");
  const [categoryId, setCategoryId] = useState(() => {
    if (initial?.categoryId) return initial.categoryId;
    // Category is mandatory now, so a brand-new rule starts pre-selected on
    // the first eligible category rather than blank.
    const startType = initial?.type ?? "expense";
    if (startType === "transfer") return "";
    const wantIncome = startType === "income";
    const first = categories.find((c) => c.isActive && (wantIncome ? c.kind === "income" || c.kind === "both" : c.kind === "expense" || c.kind === "both"));
    return first?.id ?? "";
  });
  const [newCatOpen, setNewCatOpen] = useState(false);
  const fallbackAccountId = accounts.find((a) => a.id === preference.defaultAccountId)?.id ?? (accounts.find((a) => !a.isArchived) ?? accounts[0])?.id ?? "";
  const [accountId, setAccountId] = useState(
    initial?.accountId ?? fallbackAccountId,
  );
  const [transferAccountId, setTransferAccountId] = useState(initial?.transferAccountId ?? "");
  const [frequency, setFrequency] = useState<Frequency>(initial?.frequency ?? "monthly");
  // Daily and quarterly have no chip of their own, so they open on Custom.
  const [custom, setCustom] = useState(() => !isQuick(initial?.frequency ?? "monthly"));
  const [interval, setInterval] = useState(initial ? String(initial.interval) : "1");
  const [startDate, setStartDate] = useState(initial?.startDate ?? toISODate(new Date()));
  const [endDate, setEndDate] = useState(initial?.endDate ?? "");
  const [autoPost, setAutoPost] = useState(initial?.autoPost ?? false);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  // Starts open when a setting in there is already in use, so it isn't missed.
  const [moreOpen, setMoreOpen] = useState(() => !!initial && (!!initial.endDate || initial.autoPost || !initial.isActive));
  const [picker, setPicker] = useState<Picker>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => onBusyChange?.(saving), [saving, onBusyChange]);

  const isTransfer = type === "transfer";
  const eligibleCategories = useMemo(() => {
    const wantIncome = type === "income";
    return categories.filter((c) => {
      if (!c.isActive && c.id !== categoryId) return false;
      if (wantIncome) return c.kind === "income" || c.kind === "both";
      return c.kind === "expense" || c.kind === "both";
    });
  }, [categories, type, categoryId]);

  const category = categories.find((c) => c.id === categoryId);
  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name;
  const intervalNum = Math.trunc(Number(interval)) || 0;
  const closePicker = () => setPicker(null);
  /** A field's message goes as soon as it's being corrected. */
  const clearError = (field: string) => setErrors((prev) => ({ ...prev, [field]: "" }));

  function changeType(next: RecurringType) {
    setType(next);
    // Fall back to the first eligible category for the new type (see
    // the matching note in transaction-form) — category is mandatory,
    // so this keeps the field filled instead of reverting to blank.
    setCategoryId((prev) => {
      if (next === "transfer") return "";
      const wantIncome = next === "income";
      const matches = (c: (typeof categories)[number]) =>
        wantIncome ? c.kind === "income" || c.kind === "both" : c.kind === "expense" || c.kind === "both";
      const cat = categories.find((c) => c.id === prev);
      if (cat && matches(cat)) return prev;
      return categories.find((c) => c.isActive && matches(c))?.id ?? "";
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setFormError(null);

    const localErrors: Record<string, string> = {};
    if (!name.trim()) localErrors.name = "Name is required";

    let paise = 0;
    let amountParsed = true;
    try {
      paise = toPaise(amount);
    } catch {
      localErrors.amount = "Enter a valid amount";
      amountParsed = false;
    }
    if (amountParsed && paise <= 0) localErrors.amount = "Amount must be greater than zero";

    if (intervalNum < 1 || intervalNum > MAX_INTERVAL) localErrors.interval = `Must be between 1 and ${MAX_INTERVAL}`;

    if (!accountId) localErrors.accountId = "Choose an account";
    if (!isTransfer && !categoryId) localErrors.categoryId = "Choose a category";
    if (isTransfer && (!transferAccountId || transferAccountId === accountId)) {
      localErrors.transferAccountId = "Choose a different destination account";
    }
    if (endDate && startDate && endDate < startDate) {
      localErrors.endDate = "End date must be after the start date";
    }
    // Only on create — backdating an existing rule's end date to "it already
    // ended" is a legitimate edit (see the matching check in the API route).
    if (!initial && endDate && endDate < toISODate(new Date())) {
      localErrors.endDate = "End date can't be in the past";
    }
    if (Object.keys(localErrors).length) {
      setErrors(localErrors);
      if (localErrors.endDate) setMoreOpen(true); // or its message would be out of sight
      return;
    }

    const payload = {
      name: name.trim(),
      type,
      amount: paise,
      categoryId: isTransfer ? null : categoryId,
      accountId,
      transferAccountId: isTransfer ? transferAccountId : null,
      frequency,
      interval: intervalNum,
      startDate,
      endDate: endDate || null,
      autoPost,
      isActive,
    };

    setSaving(true);
    try {
      const res = editing
        ? await apiPatch<{ recurring: RecurringDTO[] }>(`/api/recurring/${initial!.id}`, payload)
        : await apiPost<{ recurring: RecurringDTO[] }>("/api/recurring", payload);
      onSaved(res.recurring);
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
        if (err.fields) {
          setErrors(err.fields);
          if (err.fields.endDate) setMoreOpen(true);
        }
      } else setFormError("Could not save. Please try again.");
      setSaving(false);
    }
  }

  const accountOptions = accounts.map((a) => ({ id: a.id, label: a.name, meta: formatINR(a.balance) }));

  return (
    <form onSubmit={onSubmit} className="flex min-h-full flex-col" noValidate>
      <div className="flex-1 space-y-3 px-4 pb-4 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:pt-4">
        <header className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              aria-label="Back"
              className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl border border-border text-fg transition-colors active:bg-surface-2 disabled:opacity-50"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h2 className="text-headline-md text-fg">{editing ? "Edit Recurring" : "New Recurring"}</h2>
            <p className="mt-1 text-body-sm text-muted">{editing ? "Update the schedule or amount." : "Automate a repeating transaction."}</p>
          </div>
          <RepeatCalendar />
        </header>

        {formError && (
          <p role="alert" className="rounded-lg border border-expense/30 bg-expense/10 px-3 py-2 text-body-sm text-expense">
            {formError}
          </p>
        )}

        <div role="radiogroup" aria-label="Type" className="flex gap-2">
          {TYPE_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={type === value}
              onClick={() => changeType(value)}
              className={cn(
                "flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full border border-border text-[13px] font-bold transition-colors",
                type === value ? "bg-brand text-brand-fg" : "text-fg",
              )}
            >
              <Icon aria-hidden className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
        </div>

        <div>
          <label className={cn(CARD, "flex items-center gap-2.5 px-3 py-2.5 focus-within:border-brand", errors.name ? "border-expense" : "border-border")}>
            <span className="flex w-8 shrink-0 justify-center text-fg">
              <Tag aria-hidden className="h-6 w-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-fg">
                Name
                <Required />
              </span>
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  clearError("name");
                }}
                maxLength={120}
                aria-invalid={!!errors.name}
                placeholder="e.g. Netflix, Rent, Salary"
                className={cn("w-full bg-transparent text-fg placeholder:text-muted focus:outline-none", VALUE)}
              />
            </span>
          </label>
          <FieldError message={errors.name} />
        </div>

        <div>
          <label className={cn(CARD, "flex items-center gap-2.5 px-3 py-2.5 focus-within:border-brand", errors.amount ? "border-expense" : "border-border")}>
            <span className="flex w-8 shrink-0 justify-center text-fg">
              <Coins aria-hidden className="h-6 w-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-fg">
                Amount
                <Required />
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden className={cn("text-fg", VALUE)}>₹</span>
                <input
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value.replace(/[^0-9.]/g, ""));
                    clearError("amount");
                  }}
                  aria-invalid={!!errors.amount}
                  placeholder="0"
                  className={cn("tnum w-full min-w-0 bg-transparent text-fg placeholder:text-muted focus:outline-none", VALUE)}
                />
              </span>
            </span>
          </label>
          <FieldError message={errors.amount} />
        </div>

        {/* Side by side when there's room for the value beside its icon. */}
        <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
          {!isTransfer && (
            <PickerRow
              icon={category ? <CategoryIcon icon={category.icon} size={28} /> : <LayoutGrid className="h-6 w-6" />}
              label="Category"
              value={category?.name}
              placeholder="Choose"
              required
              error={errors.categoryId}
              onClick={() => setPicker("category")}
            />
          )}
          <PickerRow
            icon={<Wallet className="h-6 w-6" />}
            label={isTransfer ? "From" : "Account"}
            value={accountName(accountId)}
            placeholder="Choose"
            required
            error={errors.accountId}
            onClick={() => setPicker("account")}
          />
          {isTransfer && (
            <PickerRow
              icon={<ArrowLeftRight className="h-6 w-6" />}
              label="To"
              value={accountName(transferAccountId)}
              placeholder="Choose"
              required
              error={errors.transferAccountId}
              onClick={() => setPicker("toAccount")}
            />
          )}
        </div>

        <RepeatSection
          custom={custom}
          onCustom={setCustom}
          frequency={frequency}
          onFrequency={setFrequency}
          interval={interval}
          onInterval={setInterval}
          intervalNum={intervalNum}
          error={errors.interval}
          startDate={startDate}
          onPickStart={() => setPicker("start")}
        />

        <MoreOptions
          open={moreOpen}
          onToggle={() => setMoreOpen((o) => !o)}
          endDate={endDate}
          endError={errors.endDate}
          onPickEnd={() => setPicker("end")}
          autoPost={autoPost}
          onAutoPost={setAutoPost}
          isActive={isActive}
          onActive={setIsActive}
        />
      </div>

      <footer className="sticky bottom-0 grid grid-cols-2 gap-3 border-t border-border/20 bg-surface px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 sm:pb-4">
        <Button type="button" size="lg" variant="outline" onClick={onCancel} disabled={saving} className="w-full !rounded-lg !px-2">
          Cancel
        </Button>
        <Button type="submit" size="lg" loading={saving} className="w-full !rounded-lg !px-2">
          {editing ? "Save Changes" : "Create Recurring"}
        </Button>
      </footer>

      <CategoryPickerSheet
        open={picker === "category"}
        onClose={closePicker}
        categories={eligibleCategories}
        selected={categoryId}
        subtitle="Pick a category for this recurring item."
        onPick={(id) => {
          setCategoryId(id);
          clearError("categoryId");
        }}
        onCreateNew={() => setNewCatOpen(true)}
      />
      <PickerSheet
        open={picker === "account"}
        title={isTransfer ? "From account" : "Account"}
        onClose={closePicker}
        selected={accountId}
        options={accountOptions}
        onPick={(id) => {
          setAccountId(id);
          clearError("accountId");
          if (id === transferAccountId) setTransferAccountId("");
        }}
      />
      <PickerSheet
        open={picker === "toAccount"}
        title="To account"
        onClose={closePicker}
        selected={transferAccountId}
        options={accountOptions.filter((a) => a.id !== accountId)}
        onPick={(id) => {
          setTransferAccountId(id);
          clearError("transferAccountId");
        }}
      />
      <DatePickerSheet
        open={picker === "start"}
        date={startDate}
        subtitle="Choose when this starts."
        onClose={closePicker}
        onPick={setStartDate}
      />
      <DatePickerSheet
        open={picker === "end"}
        date={endDate}
        min={startDate}
        optional
        subtitle="Choose when this stops repeating."
        onClose={closePicker}
        onPick={(date) => {
          setEndDate(date);
          clearError("endDate");
        }}
      />
      <QuickCategoryModal
        open={newCatOpen}
        onClose={() => setNewCatOpen(false)}
        defaultKind={type === "income" ? "income" : "expense"}
        onCreated={(newCat) => {
          setCategoryId(newCat.id);
        }}
      />
    </form>
  );
}
