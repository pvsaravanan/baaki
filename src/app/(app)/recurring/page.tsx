"use client";
import { usePageData } from "@/lib/local-api";
import { PageHeader } from "@/components/app/page-header";
import { RecurringView } from "@/components/app/recurring-view";
import { ScreenData } from "@/components/app/screen-data";

export default function RecurringPage() {
  const { data, error } = usePageData("recurring");
  return (
    <div>
      <PageHeader
        title="Recurring"
        description="Automate the bills, subscriptions and income you expect every period."
      />
      <ScreenData data={data} error={error}>{(d) => <RecurringView recurring={d.recurring} />}</ScreenData>
    </div>
  );
}
