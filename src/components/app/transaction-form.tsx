"use client";
import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { useAppData } from "./app-data";
import { ApiError, apiPatch, apiPost } from "@/lib/http";
import { toISODate } from "@/lib/dates";
import { toPaise, toRupees } from "@/lib/money";
import { suggestCategory } from "@/lib/categorize";
import { QuickCategoryModal } from "./quick-category-modal";
import { PAYMENT_METHODS, type TransactionType } from "@/lib/constants";
import type { TransactionDTO } from "@/lib/types";
import { calculateExpenseSplit, type ExpenseSplitMethod } from "@/lib/expense-split";
import { TypeAndAmountFields } from "./transaction-form/type-amount-fields";
import { CategoryAccountFields } from "./transaction-form/category-account-fields";
import { SplitPartsEditor } from "./transaction-form/split-parts-editor";
import { DateMethodFields } from "./transaction-form/date-method-fields";
import { PeopleSplitSection } from "./transaction-form/people-split-section";
import { TagsInput } from "./transaction-form/tags-input";
import type { PartRow, ShareRow } from "./transaction-form/types";

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
  initialGroup,
  prefillDate,
  onSaved,
  onCancel,
  onBusyChange,
}: {
  initial?: TransactionDTO;
  /** All parts of an existing split expense, when editing one. Takes priority over `initial`. */
  initialGroup?: TransactionDTO[];
  prefillDate?: string;
  onSaved: (txn: TransactionDTO | TransactionDTO[]) => void;
  onCancel?: () => void;
  /** Notifies the parent (which owns the Modal) while a save is in flight. */
  onBusyChange?: (busy: boolean) => void;
}) {
  const { accounts, categories, contacts, preference } = useAppData();

  const editingGroup = !!initialGroup && initialGroup.length > 0;
  // Shared fields (description, date, notes…) are uniform across a split
  // group, so any row stands in for them.
  const primary = editingGroup ? initialGroup![0] : initial;
  // People-shares are attached to whichever part was created first. Since all
  // parts of a split share an identical createdAt (one DB transaction), that
  // "first" row isn't reliably initialGroup[0] after a re-fetch — so find the
  // row that actually carries the shares rather than assuming a position.
  const groupShares = editingGroup ? initialGroup!.find((t) => t.shares.length > 0)?.shares ?? [] : primary?.shares ?? [];
  const editingSingle = !!initial && !editingGroup;
  const editing = editingGroup || editingSingle;
  const splitGroupId = editingGroup ? initialGroup![0].splitGroupId! : null;

  const [type, setType] = useState<TransactionType>(editingGroup ? "expense" : primary?.type ?? "expense");
  const [amount, setAmount] = useState(primary && !editingGroup ? String(toRupees(primary.amount)) : "");
  const [description, setDescription] = useState(primary?.description ?? "");
  const [date, setDate] = useState(primary?.date ?? prefillDate ?? toISODate(new Date()));
  const [categoryId, setCategoryId] = useState(() => {
    if (primary?.categoryId) return primary.categoryId;
    // New transactions start with no category selected; the user either picks
    // one manually or the app auto-suggests from the description.
    return "";
  });
  const [newCatOpen, setNewCatOpen] = useState(false);
  const fallbackAccountId = accounts.find((a) => a.id === preference.defaultAccountId)?.id ?? accounts[0]?.id ?? "";
  // Splits are always an expense breakdown — used to seed every blank split
  // row so a newly-added part isn't left uncategorized.
  const fallbackExpenseCategoryId = categories.find((c) => c.isActive && (c.kind === "expense" || c.kind === "both"))?.id ?? "";
  const [accountId, setAccountId] = useState(primary?.accountId ?? fallbackAccountId);
  const [transferAccountId, setTransferAccountId] = useState(primary?.transferAccountId ?? "");
  const initialMethodIsCustom = primary?.paymentMethod ? !(PAYMENT_METHODS as readonly string[]).includes(primary.paymentMethod) : false;
  const [methodSelect, setMethodSelect] = useState<string>(initialMethodIsCustom ? "__custom__" : primary?.paymentMethod ?? "upi");
  const [customMethod, setCustomMethod] = useState<string>(initialMethodIsCustom ? primary?.paymentMethod ?? "" : "");
  const [notes, setNotes] = useState(primary?.notes ?? "");
  const [showNotes, setShowNotes] = useState(!!primary?.notes);
  const [tags, setTags] = useState<string[]>(primary?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [touchedCategory, setTouchedCategory] = useState(editingSingle);
  const [autoSuggestedName, setAutoSuggestedName] = useState<string | null>(null);

  // Split-by-category/account. Locked ON when editing an existing group;
  // otherwise only offered when creating a fresh expense (converting an
  // already-saved single transaction into a split isn't supported here).
  const [splitEnabled, setSplitEnabled] = useState(editingGroup);
  const [parts, setParts] = useState<PartRow[]>(
    editingGroup
      ? initialGroup!.map((t) => ({ amount: String(toRupees(t.amount)), categoryId: t.categoryId ?? "", accountId: t.accountId }))
      : editingSingle && primary
        ? // Converting a saved single into a split: seed part 1 from it, add a blank part 2.
          [
            { amount: String(toRupees(primary.amount)), categoryId: primary.categoryId ?? fallbackExpenseCategoryId, accountId: primary.accountId },
            { amount: "", categoryId: fallbackExpenseCategoryId, accountId: primary.accountId },
          ]
        : [
            { amount: "", categoryId: fallbackExpenseCategoryId, accountId: fallbackAccountId },
            { amount: "", categoryId: fallbackExpenseCategoryId, accountId: fallbackAccountId },
          ],
  );
  const [splitTotal, setSplitTotal] = useState("");

  // Split-with-people. Shares live on the group's primary row (or the plain
  // transaction itself) and are capped against the group/transaction total.
  const [peopleEnabled, setPeopleEnabled] = useState(groupShares.length > 0);
  const [shareMode, setShareMode] = useState<ExpenseSplitMethod>(groupShares.length > 0 ? "amounts" : "equal");
  const [yourWeight, setYourWeight] = useState("1");
  const [shareRows, setShareRows] = useState<ShareRow[]>(
    groupShares.map((s) => ({ contactId: s.contactId, amount: String(toRupees(s.amount)), percent: "", weight: "1" })),
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
    if (isTransfer || splitEnabled || touchedCategory || categoryId) return null;
    const name = suggestCategory(description);
    if (!name) return null;
    const match = eligibleCategories.find((c) => c.name.toLowerCase() === name.toLowerCase());
    return match ?? null;
  }, [description, isTransfer, splitEnabled, touchedCategory, categoryId, eligibleCategories]);

  // Auto-apply the suggested category when the user types a description.
  // Only for new transactions — never override a manually-picked category.
  useEffect(() => {
    if (editing) return;
    if (isTransfer || splitEnabled || touchedCategory) return;
    const trimmed = description.trim();
    if (!trimmed) {
      setAutoSuggestedName(null);
      return;
    }
    const name = suggestCategory(trimmed);
    if (!name) {
      setAutoSuggestedName(null);
      return;
    }
    const match = eligibleCategories.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (match) {
      setCategoryId(match.id);
      setAutoSuggestedName(match.name);
    } else {
      setAutoSuggestedName(null);
    }
  }, [description, isTransfer, splitEnabled, touchedCategory, editing, eligibleCategories]);

  function addTag(value: string) {
    const v = value.trim();
    if (v && !tags.includes(v)) setTags((t) => [...t, v]);
    setTagInput("");
  }

  function updatePart(i: number, patch: Partial<PartRow>) {
    setParts((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }
  function addPart() {
    setParts((prev) => [...prev, { amount: "", categoryId: fallbackExpenseCategoryId, accountId: fallbackAccountId }]);
  }
  function removePart(i: number) {
    setParts((prev) => (prev.length > 2 ? prev.filter((_, idx) => idx !== i) : prev));
  }
  /** Divide the entered total equally across the current parts (remainder to the first). */
  function splitPartsEqually() {
    const total = safePaise(splitTotal);
    if (total <= 0) return;
    const n = parts.length;
    const per = Math.floor(total / n);
    const remainder = total - per * n;
    setParts((prev) => prev.map((p, i) => ({ ...p, amount: String(toRupees(per + (i === 0 ? remainder : 0))) })));
  }

  function updateShare(i: number, patch: Partial<ShareRow>) {
    setShareRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addShareRow() {
    const used = new Set(shareRows.map((r) => r.contactId));
    const next = contacts.find((c) => !c.isArchived && !used.has(c.id));
    if (!next || shareRows.length >= 20) return;
    setShareRows((prev) => [...prev, { contactId: next.id, amount: "", percent: "", weight: "1" }]);
  }
  function removeShare(i: number) {
    setShareRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  const partsTotal = useMemo(() => parts.reduce((s, p) => s + safePaise(p.amount), 0), [parts]);
  const mainAmountPaise = safePaise(amount);
  const totalForShares = splitEnabled ? partsTotal : mainAmountPaise;
  const selectedShareRows = useMemo(() => shareRows.filter((r) => r.contactId), [shareRows]);
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
    if (!row.contactId) return 0;
    const index = selectedShareRows.indexOf(row) + 1; // participants include you
    return splitResult.amounts[index] ?? 0;
  }

  const sharesTotal = shareRows.reduce((s, r) => s + shareAmountPaise(r), 0);
  const yourShare = splitResult.amounts[0];

  const availableContacts = contacts.filter((c) => !c.isArchived || shareRows.some((row) => row.contactId === c.id));
  const canAddPerson = shareRows.length < 20 && contacts.some((c) => !c.isArchived && !shareRows.some((row) => row.contactId === c.id));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setFormError(null);

    const localErrors: Record<string, string> = {};

    const sharing = type === "expense" && peopleEnabled;
    if (sharing && shareRows.some((r) => !r.contactId)) {
      localErrors.shares = "Choose a person for every split row";
    }
    if (sharing && new Set(selectedShareRows.map((r) => r.contactId)).size !== selectedShareCount) {
      localErrors.shares = "Each person can only appear once";
    }
    if (sharing && splitResult.error) {
      localErrors.shares ??= splitResult.error;
    }
    const shares =
      sharing && !localErrors.shares
        ? selectedShareRows
            .map((r) => ({ contactId: r.contactId, amount: shareAmountPaise(r) }))
            .filter((s) => s.amount > 0)
        : [];

    if (splitEnabled) {
      if (parts.length < 2) localErrors.parts = "Add at least 2 splits";
      for (const p of parts) {
        if (!p.accountId) { localErrors.parts = "Choose an account for every split"; break; }
        if (!p.categoryId) { localErrors.parts = "Choose a category for every split"; break; }
        if (safePaise(p.amount) <= 0) { localErrors.parts = "Every split needs an amount greater than zero"; break; }
      }
      if (!description.trim()) localErrors.description = "Description is required";
      if (Object.keys(localErrors).length) {
        setErrors(localErrors);
        return;
      }

      const payload = {
        description: description.trim(),
        date,
        paymentMethod: (methodSelect === "__custom__" ? customMethod.trim().toLowerCase() : methodSelect) || null,
        notes: notes.trim() || null,
        tags,
        parts: parts.map((p) => ({ amount: safePaise(p.amount), categoryId: p.categoryId, accountId: p.accountId })),
        shares,
        // Converting a saved single expense into a split: the server replaces it.
        replaceId: editingSingle ? initial!.id : undefined,
      };

      setSaving(true);
      try {
        const res = editingGroup
          ? await apiPatch<{ transactions: TransactionDTO[] }>(`/api/transactions/split/${splitGroupId}`, payload)
          : await apiPost<{ transactions: TransactionDTO[] }>("/api/transactions", payload);
        onSaved(res.transactions);
      } catch (err) {
        if (err instanceof ApiError) {
          setFormError(err.message);
          if (err.fields) setErrors(err.fields);
        } else setFormError("Could not save. Please try again.");
        setSaving(false);
      }
      return;
    }

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
      const res = editingSingle
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
        splitEnabled={splitEnabled}
        type={type}
        setType={setType}
        categories={categories}
        setCategoryId={setCategoryId}
        amount={amount}
        setAmount={setAmount}
        amountError={errors.amount}
        editing={editing}
      />

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

      {splitEnabled ? (
        <SplitPartsEditor
          parts={parts}
          partsTotal={partsTotal}
          partsError={errors.parts}
          splitTotal={splitTotal}
          setSplitTotal={setSplitTotal}
          onSplitEqually={splitPartsEqually}
          accounts={accounts}
          eligibleCategories={eligibleCategories}
          updatePart={updatePart}
          addPart={addPart}
          removePart={removePart}
        />
      ) : (
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
      )}

      <DateMethodFields
        date={date}
        setDate={setDate}
        isTransfer={isTransfer}
        methodSelect={methodSelect}
        setMethodSelect={setMethodSelect}
        customMethod={customMethod}
        setCustomMethod={setCustomMethod}
      />

      {/* Split toggle — new expenses, or converting a saved single expense.
          An existing split group stays locked on. */}
      {type === "expense" && (
        <label className="flex items-center gap-2 text-sm text-fg">
          <input
            type="checkbox"
            checked={splitEnabled}
            disabled={editingGroup}
            onChange={(e) => setSplitEnabled(e.target.checked)}
            className="h-4 w-4"
          />
          Split across categories or accounts
          {editingGroup && <span className="text-xs text-faint">(this is a split expense)</span>}
          {editingSingle && !editingGroup && splitEnabled && (
            <span className="text-xs text-faint">(converting to a split)</span>
          )}
        </label>
      )}

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
        availableContacts={availableContacts}
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
