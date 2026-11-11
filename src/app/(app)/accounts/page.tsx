"use client";
import { useState } from "react";
import { usePageData } from "@/lib/local-api";
import { AccountsView } from "@/components/app/accounts-view";
import { BackButton } from "@/components/app/back-button";
import { ScreenData } from "@/components/app/screen-data";
import { AccountsArt } from "@/components/app/page-illustrations";

export default function AccountsPage() {
  const { data, error } = usePageData("accounts");
  const [adding, setAdding] = useState(false);
  return (
    <div>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <BackButton />
            <h1 className="text-headline-md text-fg sm:text-headline-lg">Accounts</h1>
          </div>
          <p className="mt-1 text-body-sm text-muted">Manage your money across accounts.</p>
        </div>
        <AccountsArt />
      </div>
      <ScreenData data={data} error={error}>
        {(d) => <AccountsView accounts={d.accounts} adding={adding} onAddingChange={setAdding} />}
      </ScreenData>
    </div>
  );
}
