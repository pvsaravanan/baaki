"use client";
import { useState } from "react";
import { CreditCard } from "lucide-react";
import { apiPatch, ApiError } from "@/lib/http";
import { formatINR } from "@/lib/money";
import { useAppData } from "@/components/app/app-data";
import { PickerSheet } from "@/components/app/transaction-form/add-transaction-flow";
import { useToast } from "@/components/ui/toast";
import { NavRow } from "./settings-rows";

/** The account pre-selected when adding a transaction. */
export function DefaultAccountRow() {
  const { accounts, preference, refresh } = useAppData();
  const { success, error } = useToast();
  const [open, setOpen] = useState(false);

  async function handleDefaultAccount(value: string) {
    try {
      await apiPatch("/api/preferences", { defaultAccountId: value || null });
      success("Saved");
      refresh();
    } catch (e) {
      error(e instanceof ApiError ? e.message : "Could not save default account");
    }
  }

  const current = accounts.find((a) => a.id === preference.defaultAccountId);

  return (
    <>
      <NavRow icon={<CreditCard />} label="Default account" value={current?.name ?? "None"} onClick={() => setOpen(true)} />
      <PickerSheet
        open={open}
        title="Default account"
        onClose={() => setOpen(false)}
        selected={preference.defaultAccountId ?? ""}
        options={[
          { id: "", label: "No default" },
          ...accounts.map((a) => ({ id: a.id, label: a.name, meta: formatINR(a.balance) })),
        ]}
        onPick={handleDefaultAccount}
      />
    </>
  );
}
