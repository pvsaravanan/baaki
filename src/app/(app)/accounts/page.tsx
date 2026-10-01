"use client";
import { usePageData } from "@/lib/local-api";
import { PageHeader } from "@/components/app/page-header";
import { AccountsView } from "@/components/app/accounts-view";
import { ScreenData } from "@/components/app/screen-data";

export default function AccountsPage() {
  const { data, error } = usePageData("accounts");
  return (
    <div>
      <PageHeader title="Accounts" description="Track balances across your banks, cash and cards." />
      <ScreenData data={data} error={error}>{(d) => <AccountsView accounts={d.accounts} />}</ScreenData>
    </div>
  );
}
