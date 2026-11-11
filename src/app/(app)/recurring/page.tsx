"use client";
import { usePageData } from "@/lib/local-api";
import { PageBanner } from "@/components/app/page-banner";
import { RecurringView } from "@/components/app/recurring-view";
import { RepeatCalendar } from "@/components/app/repeat-calendar";
import { ScreenData } from "@/components/app/screen-data";

export default function RecurringPage() {
  const { data, error } = usePageData("recurring");
  return (
    <div>
      <PageBanner
        title="Recurring"
        subtitle="Automate the bills, subscriptions and income you expect every period."
        art={<RepeatCalendar />}
      />
      <ScreenData data={data} error={error}>{(d) => <RecurringView recurring={d.recurring} />}</ScreenData>
    </div>
  );
}
