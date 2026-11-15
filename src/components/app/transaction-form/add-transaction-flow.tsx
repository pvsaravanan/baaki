"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowLeftRight, CalendarDays, CreditCard, Pencil, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { evaluateAmount } from "@/lib/money/amount-keypad";
import { suggestCategoryKey } from "@/lib/transactions/categorize";
import { cn } from "@/lib/ui/cn";
import { type Frequency, type TransactionType } from "@/lib/constants";
import { toISODate } from "@/lib/dates";
import { ApiError, apiPatch, apiPost } from "@/lib/request/http";
import { formatINR, toRupees } from "@/lib/money/money";
import type { TransactionDTO } from "@/lib/types";
import { useAppData } from "../app-data";
import { CategoryIcon } from "../category-icon";
import { QuickCategoryModal } from "../quick-category-modal";
import { DatePickerSheet } from "../date-picker-sheet";
import { CategoryPickerSheet } from "./category-picker-sheet";
import { buildSplits, newPerson, SplitSection, type SplitPerson } from "./split-section";
import { TYPE_OPTIONS } from "./types";
import { equalShare, isEqualSplit, type SplitMode } from "@/lib/money/split";
import { AmountStep } from "./amount-step";
import { DetailRow, MoreDetails, Stepper, dateLabel } from "./details-step";
import { PickerSheet } from "./picker-sheet";

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

  // Splitting: shares already paid back can't change here; the open ones can.
  const settledSplits = useMemo(() => initial?.splits.filter((s) => s.settledAt) ?? [], [initial]);
  const [splitOn, setSplitOn] = useState(!!initial?.splits.length);
  const [splitPeople, setSplitPeople] = useState<SplitPerson[]>(() =>
    (initial?.splits ?? []).filter((s) => !s.settledAt).map((s) => newPerson(s.name, String(toRupees(s.amount)))),
  );
  const [splitMode, setSplitMode] = useState<SplitMode>(() => {
    const open = (initial?.splits ?? []).filter((s) => !s.settledAt).map((s) => s.amount);
    const settledSum = settledSplits.reduce((sum, s) => sum + s.amount, 0);
    return initial && !isEqualSplit(initial.amount - settledSum, open) ? "custom" : "equal";
  });

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
    // A split with nobody in it is no split.
    const splitting = type === "expense" && splitOn && splitPeople.length > 0;
    const split = buildSplits(splitMode, paise, settledSplits, splitting ? splitPeople : []);
    if (splitting && split.problem) found.splits = split.problem;
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
      splits: split.splits,
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

            {type === "expense" && (
              <SplitSection
                total={paise}
                on={splitOn}
                onToggle={(on) => {
                  setSplitOn(on);
                  if (on && splitPeople.length === 0) setSplitPeople([newPerson()]);
                  setErrors((e) => ({ ...e, splits: "" }));
                }}
                mode={splitMode}
                onMode={(mode) => {
                  // Going to custom amounts starts from the equal split, to adjust.
                  if (mode === "custom") {
                    const settledSum = settledSplits.reduce((sum, s) => sum + s.amount, 0);
                    const each = toRupees(equalShare(paise - settledSum, splitPeople.length));
                    setSplitPeople((list) => list.map((p) => (p.amount ? p : { ...p, amount: each ? String(each) : "" })));
                  }
                  setSplitMode(mode);
                }}
                people={splitPeople}
                onPeople={(list) => {
                  setSplitPeople(list);
                  setErrors((e) => ({ ...e, splits: "" }));
                }}
                settled={settledSplits}
                error={errors.splits}
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

