"use client";
import { useState } from "react";
import { apiPatch, ApiError } from "@/lib/http";
import { useAppData } from "@/components/app/app-data";
import { SelectMenu } from "@/components/ui/select-menu";
import { useToast } from "@/components/ui/toast";
import { Row, Section } from "./layout";

export function PreferencesSection() {
  const { accounts, preference, refresh } = useAppData();
  const { success, error } = useToast();
  const [savingAccount, setSavingAccount] = useState(false);

  async function handleDefaultAccount(value: string) {
    setSavingAccount(true);
    try {
      await apiPatch("/api/preferences", { defaultAccountId: value || null });
      success("Saved");
      refresh();
    } catch (e) {
      error(e instanceof ApiError ? e.message : "Could not save default account");
    } finally {
      setSavingAccount(false);
    }
  }

  return (
    <Section id="preferences" title="Preferences" description="How baaki looks and behaves.">
      <Row title="Dark mode" description="This will come soon.">
        <span className="inline-block border border-border bg-surface-2 px-2 py-1 text-label-sm uppercase text-muted">
          Coming soon
        </span>
      </Row>
      <Row
        title="Default account"
        description="Pre-selected when you add a transaction."
        htmlFor="default-account"
      >
        <SelectMenu
          id="default-account"
          value={preference.defaultAccountId ?? ""}
          disabled={savingAccount}
          onChange={handleDefaultAccount}
          options={[{ value: "", label: "No default" }, ...accounts.map((a) => ({ value: a.id, label: a.name }))]}
          className="w-full sm:w-56"
        />
      </Row>
    </Section>
  );
}
