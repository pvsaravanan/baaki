"use client";
import { usePageData } from "@/lib/local-api";
import { PageHeader } from "@/components/app/page-header";
import { TransactionsView } from "@/components/app/transactions-view";
import { ScreenData } from "@/components/app/screen-data";

export default function TransactionsPage() {
  const { data, error } = usePageData("transactions");
  return (
    <div>
      <PageHeader title="Transactions" description="Search, filter and manage every transaction." />
      <ScreenData data={data} error={error}>{(d) => <TransactionsView initialData={d} />}</ScreenData>
    </div>
  );
}
