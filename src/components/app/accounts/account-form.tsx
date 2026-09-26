import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Icon } from "@/components/icon";
import { ApiError, apiPatch, apiPost } from "@/lib/http";
import { toRupees } from "@/lib/money";
import { accountNameField, parseAccountForm } from "@/lib/account-form";
import { ACCOUNT_TYPES, ACCOUNT_TYPE_LABELS } from "@/lib/constants";
import type { AccountDTO } from "@/lib/types";
import { cn } from "@/lib/cn";
import { BANKS, BANK_ICON_PREFIX, getBankByIcon, type Bank } from "@/lib/banks";
import { BankPicker } from "./bank-picker";
import { SWATCHES, ACCOUNT_ICONS, OTHER_BANK } from "./constants";

export function AccountForm({
  initial,
  onSaved,
  onCancel,
  onBusyChange,
}: {
  initial: AccountDTO | null;
  onSaved: (accounts: AccountDTO[]) => void;
  onCancel: () => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const editing = !!initial;
  const initialIsCustom = initial ? !(ACCOUNT_TYPES as readonly string[]).includes(initial.type) : false;
  const initialBank = initial ? getBankByIcon(initial.icon) : undefined;
  const [name, setName] = useState(initial?.name ?? "");
  const [typeSelect, setTypeSelect] = useState<string>(initialIsCustom ? "__custom__" : initial?.type ?? "bank");
  const [customType, setCustomType] = useState<string>(initialIsCustom ? initial?.type ?? "" : "");
  const [balance, setBalance] = useState(initial ? String(toRupees(initial.openingBalance)) : "");
  const [color, setColor] = useState(initial?.color ?? SWATCHES[0]);
  const [icon, setIcon] = useState(initial?.icon ?? ACCOUNT_ICONS[0]);
  // For the "bank" type, the account's display name comes from the picked
  // bank (or a manually-typed name for "other bank") rather than a free-text
  // Name field — see pickBank / the name/nickname block below.
  const [bankId, setBankId] = useState<string | null>(() => {
    if (!initial) return null;
    if (initialBank) return initialBank.id;
    return initial.type === "bank" ? OTHER_BANK : null;
  });
  const [bankQuery, setBankQuery] = useState("");
  const [nickname, setNickname] = useState(() =>
    initialBank && initial && initial.name !== initialBank.name ? initial.name : "",
  );
  const [otherBankName, setOtherBankName] = useState(() =>
    initial && initial.type === "bank" && !initialBank ? initial.name : "",
  );

  const selectedBank = typeSelect === "bank" && bankId && bankId !== OTHER_BANK ? BANKS.find((b) => b.id === bankId) ?? null : null;
  const isOtherBank = bankId === OTHER_BANK;

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => onBusyChange?.(saving), [saving, onBusyChange]);

  function pickBank(bank: Bank | "other" | null) {
    if (bank === "other") {
      setBankId(OTHER_BANK);
      setIcon("landmark");
      setBankQuery("");
      return;
    }
    if (bank === null) {
      setBankId(null);
      return;
    }
    setBankId(bank.id);
    setColor(bank.color);
    setIcon(BANK_ICON_PREFIX + bank.id); // logo renders from this — see AccountIcon
    setBankQuery("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setFormError(null);

    const result = parseAccountForm({
      name, nickname, otherBankName, typeSelect, customType, bankId, balance, color, icon,
    });
    if (!result.success) {
      setErrors(result.errors);
      return;
    }
    const payload = result.data;

    setSaving(true);
    try {
      const res = editing
        ? await apiPatch<{ accounts: AccountDTO[] }>(`/api/accounts/${initial!.id}`, payload)
        : await apiPost<{ accounts: AccountDTO[] }>("/api/accounts", payload);
      onSaved(res.accounts);
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
        if (err.fields) {
          const fields = { ...err.fields };
          if (fields.name) {
            const message = fields.name;
            delete fields.name;
            fields[accountNameField(typeSelect, bankId)] = message;
          }
          setErrors(fields);
        }
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

      {typeSelect !== "bank" && (
        <Field label="Name" htmlFor="acc-name" error={errors.name} required>
          <Input
            id="acc-name"
            value={name}
            invalid={!!errors.name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Cash Wallet, Office Card"
          />
        </Field>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Account Type" htmlFor="acc-type" error={errors.type}>
          <Select
            id="acc-type"
            value={typeSelect}
            onChange={(e) => {
              setTypeSelect(e.target.value);
              if (e.target.value !== "bank" && icon.startsWith(BANK_ICON_PREFIX)) setIcon("landmark");
            }}
          >
            {ACCOUNT_TYPES.map((t) => (
              <option key={t} value={t}>
                {ACCOUNT_TYPE_LABELS[t]}
              </option>
            ))}
            <option value="__custom__">+ Custom account type…</option>
          </Select>
        </Field>

        <Field
          label="Opening balance (₹)"
          htmlFor="acc-balance"
          error={errors.openingBalance}
          hint={errors.openingBalance ? undefined : "Negative for cards you owe on."}
        >
          <Input
            id="acc-balance"
            inputMode="decimal"
            value={balance}
            invalid={!!errors.openingBalance}
            onChange={(e) => setBalance(e.target.value.replace(/[^0-9.-]/g, ""))}
            placeholder="0"
          />
        </Field>
      </div>

      {typeSelect === "bank" && (
        <>
          <BankPicker
            bankId={bankId}
            query={bankQuery}
            onQueryChange={setBankQuery}
            onPick={pickBank}
            error={errors.bank}
          />

          {selectedBank && (
            <Field
              label="Nickname"
              htmlFor="acc-nickname"
              error={errors.nickname}
              hint={`Optional — defaults to "${selectedBank.name}"`}
            >
              <Input
                id="acc-nickname"
                value={nickname}
                invalid={!!errors.nickname}
                maxLength={80}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="e.g. Salary account"
              />
            </Field>
          )}

          {isOtherBank && (
            <Field label="Bank name" htmlFor="acc-other-bank-name" error={errors.otherBankName} required>
              <Input
                id="acc-other-bank-name"
                value={otherBankName}
                invalid={!!errors.otherBankName}
                onChange={(e) => setOtherBankName(e.target.value)}
                placeholder="e.g. Community Co-operative Bank"
                autoFocus
              />
            </Field>
          )}
        </>
      )}

      {typeSelect === "__custom__" && (
        <Field label="Custom Type Name" htmlFor="custom-type" error={errors.type} required>
          <Input
            id="custom-type"
            value={customType}
            onChange={(e) => setCustomType(e.target.value)}
            placeholder="e.g. Mutual Fund, PF, Crypto, Gold, Chit Fund"
            autoFocus
          />
        </Field>
      )}

      {/* A picked bank already carries its own brand color — asking the
          user to also pick one would just be redundant/inconsistent. */}
      {!selectedBank && (
        <Field label="Color">
          <div className="flex flex-wrap gap-2">
            {SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Use color ${c}`}
                aria-pressed={color === c}
                className={cn(
                  "h-8 w-8 rounded-none ring-offset-2 ring-offset-surface transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                  color === c && "ring-2 ring-fg",
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </Field>
      )}

      {typeSelect !== "bank" && (
        <Field label="Icon">
          <div className="flex flex-wrap gap-2">
            {ACCOUNT_ICONS.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setIcon(name)}
                aria-label={`Use icon ${name}`}
                aria-pressed={icon === name}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-none border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                  icon === name ? "border-brand bg-brand-soft text-brand-hover" : "border-border text-muted hover:bg-surface-2",
                )}
              >
                <Icon name={name} size={18} />
              </button>
            ))}
          </div>
        </Field>
      )}

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={saving} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" loading={saving} className="flex-1">
          {editing ? "Save changes" : "Add account"}
        </Button>
      </div>
    </form>
  );
}
