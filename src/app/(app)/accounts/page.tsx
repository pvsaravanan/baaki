"use client";
import { useState } from "react";
import { usePageData } from "@/lib/local-api";
import { AccountsView } from "@/components/app/accounts-view";
import { PageBanner } from "@/components/app/page-banner";
import { ScreenData } from "@/components/app/screen-data";
import { AccountsArt } from "@/components/app/page-illustrations";

export default function AccountsPage() {
  const { data, error } = usePageData("accounts");
  const [adding, setAdding] = useState(false);
  return (
    <div>
      <PageBanner
        title="Accounts"
        subtitle="Manage your money across accounts."
        art={<AccountsArt />}
      />
      <ScreenData data={data} error={error}>
        {(d) => <AccountsView accounts={d.accounts} adding={adding} onAddingChange={setAdding} />}
      </ScreenData>
    </div>
  );
}
