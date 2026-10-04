"use client";
import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { useAppData } from "./app-data";
import { ApiError, apiPatch, apiPost } from "@/lib/http";
import { toISODate } from "@/lib/dates";
import { formatINR, toPaise, toRupees } from "@/lib/money";
import { actualBalanceChange, goalMoneySpent } from "@/lib/goal-allocation";
import type { Movement } from "@/lib/balance-guard";
import { useConfirm } from "@/components/ui/confirm";
import { suggestCategoryKey } from "@/lib/categorize";
import { QuickCategoryModal } from "./quick-category-modal";
import { PAYMENT_METHODS, type TransactionType } from "@/lib/constants";
import type { TransactionDTO } from "@/lib/types";
import { calculateExpenseSplit, type ExpenseSplitMethod } from "@/lib/expense-split";
import { TypeAndAmountFields } from "./transaction-form/type-amount-fields";
import { CategoryAccountFields } from "./transaction-form/category-account-fields";
import { DateMethodFields } from "./transaction-form/date-method-fields";
import { PeopleSplitSection } from "./transaction-form/people-split-section";
import { TagsInput } from "./transaction-form/tags-input";
import type { ShareRow } from "./transaction-form/types";
import { GoalMoneyNotice, reservedGoalsText } from "./transaction-form/goal-money-notice";

/** Parse a rupee string to paise, or 0 if it doesn't parse — for running totals, not submission. */
function safePaise(s: string): number {
  try {
    return toPaise(s);
  } catch {
    return 0;
  }
}

export function TransactionForm({
  initial,
  prefillDate,
  onSaved,
  onCancel,
  onBusyChange,
}: {
  initial?: TransactionDTO;
  prefillDate?: string;
  onSaved: (txn: TransactionDTO) => void;
  onCancel?: () => void;
  /** Notifies the parent (which owns the Modal) while a save is in flight. */
  onBusyChange?: (busy: boolean) => void;
}) {
  const { accounts, categories, contacts, preference, goalMoney } = useAppData();
  const confirm = useConfirm();

  const editing = !!initial;
  const primary = initial;
  const existingShares = primary?.shares ?? [];

  const [type, setType] = useState<TransactionType>(primary?.type ?? "expense");
  const [amount, setAmount] = useState(primary ? String(toRupees(primary.amount)) : "");
  const [description, setDescription] = useState(primary?.description ?? "");
  const [date, setDate] = useState(primary?.date ?? prefillDate ?? toISODate(new Date()));
  const [categoryId, setCategoryId] = useState(() => {
    if (primary?.categoryId) return primary.categoryId;
    // New transactions start with no category selected; the user either picks
    // one manually or the app auto-suggests from the description.
    return "";
  });
  const [newCatOpen, setNewCatOpen] = useState(false);
  const fallbackAccountId = accounts.find((a) => a.id === preference.defaultAccountId)?.id ?? (accounts.find((a) => !a.isArchived) ?? accounts[0])?.id ?? "";
  const [accountId, setAccountId] = useState(primary?.accountId ?? fallbackAccountId);
  const [transferAccountId, setTransferAccountId] = useState(primary?.transferAccountId ?? "");
  const initialMethodIsCustom = primary?.paymentMethod ? !(PAYMENT_METHODS as readonly string[]).includes(primary.paymentMethod) : false;
  const [methodSelect, setMethodSelect] = useState<string>(initialMethodIsCustom ? "__custom__" : primary?.paymentMethod ?? "upi");
  const [customMethod, setCustomMethod] = useState<string>(initialMethodIsCustom ? primary?.paymentMethod ?? "" : "");
  const [notes, setNotes] = useState(primary?.notes ?? "");
  const [showNotes, setShowNotes] = useState(!!primary?.notes);
  const [tags, setTags] = useState<string[]>(primary?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [touchedCategory, setTouchedCategory] = useState(editing);
  const [autoSuggestedName, setAutoSuggestedName] = useState<string | null>(null);

  // Split-with-people. Shares live on the transaction itself and are capped
  // against its amount.
  const [peopleEnabled, setPeopleEnabled] = useState(existingShares.length > 0);
  const [shareMode, setShareMode] = useState<ExpenseSplitMethod>(existingShares.length > 0 ? "amounts" : "equal");
  const [yourWeight, setYourWeight] = useState("1");
  const [shareRows, setShareRows] = useState<ShareRow[]>(
    existingShares.map((s) => ({ name: s.contactId ? s.contactName : "", amount: String(toRupees(s.amount)), percent: "", weight: "1" })),
  );

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

  // Deterministic category suggestion from the description.
  const suggestion = useMemo(() => {
    if (isTransfer || touchedCategory || categoryId) return null;
    const key = suggestCategoryKey(description);
    if (!key) return null;
    return eligibleCategories.find((c) => c.systemKey === key) ?? null;
  }, [description, isTransfer, touchedCategory, categoryId, eligibleCategories]);

  // Auto-apply the suggested category when the user types a description.
  // Only for new transactions — never override a manually-picked category.
  useEffect(() => {
    if (editing) return;
    if (isTransfer || touchedCategory) return;
    const trimmed = description.trim();
    if (!trimmed) {
      setAutoSuggestedName(null);
      return;
    }
    const key = suggestCategoryKey(trimmed);
    if (!key) {
      setAutoSuggestedName(null);
      return;
    }
    const match = eligibleCategories.find((c) => c.systemKey === key);
    if (match) {
      setCategoryId(match.id);
      setAutoSuggestedName(match.name);
    } else {
      setAutoSuggestedName(null);
    }
  }, [description, isTransfer, touchedCategory, editing, eligibleCategories]);

  function addTag(value: string) {
    const v = value.trim();
    if (v && !tags.includes(v)) setTags((t) => [...t, v]);
    setTagInput("");
  }

  function updateShare(i: number, patch: Partial<ShareRow>) {
    setShareRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addShareRow() {
    if (shareRows.length >= 20) return;
    setShareRows((prev) => [...prev, { name: "", amount: "", percent: "", weight: "1" }]);
  }
  function removeShare(i: number) {
    setShareRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  const totalForShares = safePaise(amount);
  const selectedShareRows = shareRows;
  const selectedShareCount = selectedShareRows.length;
  const splitResult = useMemo(() => calculateExpenseSplit(
    totalForShares,
    shareMode,
    selectedShareRows.map((row) => shareMode === "percent" ? row.percent : shareMode === "shares" ? row.weight : row.amount),
    yourWeight,
  ), [totalForShares, shareMode, selectedShareRows, yourWeight]);
  useEffect(() => {
    setErrors((previous) => previous.shares ? { ...previous, shares: "" } : previous);
  }, [peopleEnabled, type, shareMode, shareRows, yourWeight, totalForShares]);

  /** A row's effective share in paise, derived from the active split mode. */
  function shareAmountPaise(row: ShareRow): number {
    const index = selectedShareRows.indexOf(row) + 1; // participants include you
    return splitResult.amounts[index] ?? 0;
  }

  const sharesTotal = shareRows.reduce((s, r) => s + shareAmountPaise(r), 0);
  const yourShare = splitResult.amounts[0];

  const canAddPerson = shareRows.length < 20;

  // How much of this entry would come out of money reserved for goals (the
  // part beyond what's available) — shown as you type, confirmed on save.
  const fromGoals = useMemo(() => {
    const before: Movement[] = initial
      ? [{ type: initial.type, amount: initial.amount, accountId: initial.accountId, transferAccountId: initial.transferAccountId }]
      : [];
    const after: Movement[] = [{ type, amount: Math.max(0, safePaise(amount)), accountId, transferAccountId: isTransfer ? transferAccountId : null }];
    return goalMoneySpent(goalMoney.summary, actualBalanceChange(before, after, accounts));
  }, [initial, type, amount, accountId, isTransfer, transferAccountId, goalMoney, accounts]);

  /** Ask before saving an expense that dips into goal money. Goals are never changed. */
  function confirmGoalSpend(): Promise<boolean> {
    if (fromGoals <= 0) return Promise.resolve(true);
    return confirm({
      title: "Spend money reserved for goals?",
      message: `${formatINR(fromGoals)} of this comes from money allocated to ${reservedGoalsText(goalMoney.reserved)}. Your goals won't change — you'll be over-allocated until you adjust them or add income.`,
      confirmLabel: "Spend anyway",
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setFormError(null);

    const localErrors: Record<string, string> = {};

    const sharing = type === "expense" && peopleEnabled;
    if (sharing && shareRows.some((r) => !r.name.trim())) {
      localErrors.shares = "Enter a name for everyone in the split";
    } else if (sharing && new Set(shareRows.map((r) => r.name.trim().toLowerCase())).size !== shareRows.length) {
      localErrors.shares = "Each person can only appear once";
    }
    if (sharing && splitResult.error) {
      localErrors.shares ??= splitResult.error;
    }
    const shares =
      sharing && !localErrors.shares
        ? selectedShareRows
            .map((r) => ({ name: r.name.trim(), amount: shareAmountPaise(r) }))
            .filter((s) => s.amount > 0)
        : [];

    let paise = 0;
    let amountParsed = true;
    try {
      paise = toPaise(amount);
    } catch {
      localErrors.amount = "Enter a valid amount";
      amountParsed = false;
    }
    if (amountParsed && paise <= 0) localErrors.amount = "Amount must be greater than zero";
    if (!description.trim()) localErrors.description = "Description is required";
    if (!accountId) localErrors.accountId = "Choose an account";
    if (!isTransfer && !categoryId) localErrors.categoryId = "Choose a category";
    if (isTransfer && (!transferAccountId || transferAccountId === accountId)) {
      localErrors.transferAccountId = "Choose a different destination account";
    }
    if (Object.keys(localErrors).length) {
      setErrors(localErrors);
      return;
    }

    if (!(await confirmGoalSpend())) return;

    const payload = {
      type,
      amount: paise,
      description: description.trim(),
      date,
      categoryId: isTransfer ? null : categoryId,
      accountId,
      transferAccountId: isTransfer ? transferAccountId : null,
      paymentMethod: isTransfer
        ? null
        : (methodSelect === "__custom__" ? customMethod.trim().toLowerCase() : methodSelect) || null,
      notes: notes.trim() || null,
      tags,
      shares,
    };

    setSaving(true);
    try {
      const res = editing
        ? await apiPatch<{ transaction: TransactionDTO }>(`/api/transactions/${initial!.id}`, payload)
        : await apiPost<{ transaction: TransactionDTO }>("/api/transactions", payload);
      onSaved(res.transaction);
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

      <TypeAndAmountFields
        type={type}
        setType={setType}
        categories={categories}
        setCategoryId={setCategoryId}
        amount={amount}
        setAmount={setAmount}
        amountError={errors.amount}
        editing={editing}
      />
      <GoalMoneyNotice fromGoals={fromGoals} goalMoney={goalMoney} />

      <Field label="Description" htmlFor="description" error={errors.description} required>
        <Input
          id="description"
          value={description}
          invalid={!!errors.description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={isTransfer ? "e.g. Move to savings" : "e.g. Swiggy dinner, Uber to office"}
        />
      </Field>

      {autoSuggestedName && !touchedCategory && (
        <p className="inline-flex items-center gap-1.5 text-xs text-brand-hover">
          <Sparkles className="h-3.5 w-3.5" />
          Auto-categorized as {autoSuggestedName}
        </p>
      )}

      <CategoryAccountFields
        isTransfer={isTransfer}
        categoryId={categoryId}
        setCategoryId={setCategoryId}
        setTouchedCategory={setTouchedCategory}
        categoryError={errors.categoryId}
        eligibleCategories={eligibleCategories}
        onNewCategory={() => setNewCatOpen(true)}
        accountId={accountId}
        setAccountId={setAccountId}
        accountError={errors.accountId}
        accounts={accounts}
        transferAccountId={transferAccountId}
        setTransferAccountId={setTransferAccountId}
        transferAccountError={errors.transferAccountId}
      />

      <DateMethodFields
        date={date}
        setDate={setDate}
        isTransfer={isTransfer}
        methodSelect={methodSelect}
        setMethodSelect={setMethodSelect}
        customMethod={customMethod}
        setCustomMethod={setCustomMethod}
      />

      <PeopleSplitSection
        type={type}
        peopleEnabled={peopleEnabled}
        setPeopleEnabled={setPeopleEnabled}
        shareMode={shareMode}
        setShareMode={setShareMode}
        yourWeight={yourWeight}
        setYourWeight={setYourWeight}
        shareRows={shareRows}
        addShareRow={addShareRow}
        updateShare={updateShare}
        removeShare={removeShare}
        contacts={contacts}
        canAddPerson={canAddPerson}
        selectedShareCount={selectedShareCount}
        shareAmountPaise={shareAmountPaise}
        sharesTotal={sharesTotal}
        yourShare={yourShare}
        yourPercentage={splitResult.yourPercentage}
        totalForShares={totalForShares}
        sharesError={errors.shares}
        splitError={splitResult.error}
      />

      <TagsInput tags={tags} setTags={setTags} tagInput={tagInput} setTagInput={setTagInput} addTag={addTag} />

      {showNotes ? (
        <Field label="Notes" htmlFor="notes">
          <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional details…" />
        </Field>
      ) : (
        <button type="button" onClick={() => setShowNotes(true)} className="text-label-sm uppercase text-brand-hover underline-offset-4 hover:underline">
          + Add note
        </button>
      )}

      <div className="flex gap-2 pt-1">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={saving} className="flex-1">
            Cancel
          </Button>
        )}
        <Button type="submit" loading={saving} className="flex-1">
          {editing ? "Save changes" : "Add transaction"}
        </Button>
      </div>

      <QuickCategoryModal
        open={newCatOpen}
        onClose={() => setNewCatOpen(false)}
        defaultKind={type === "income" ? "income" : "expense"}
        onCreated={(newCat) => {
          setCategoryId(newCat.id);
          setTouchedCategory(true);
        }}
      />
    </form>
  );
}
