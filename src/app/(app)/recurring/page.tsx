"use client";
import { usePageData } from "@/lib/local-api";
import { BackButton } from "@/components/app/back-button";
import { RecurringView } from "@/components/app/recurring-view";
import { RepeatCalendar } from "@/components/app/repeat-calendar";
import { ScreenData } from "@/components/app/screen-data";

export default function RecurringPage() {
  const { data, error } = usePageData("recurring");
  return (
    <div>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <BackButton />
            <h1 className="text-headline-md text-fg sm:text-headline-lg">Recurring</h1>
          </div>
          <p className="mt-1 text-body-sm text-muted">Automate the bills, subscriptions and income you expect every period.</p>
        </div>
        <RepeatCalendar />
      </div>
      <ScreenData data={data} error={error}>{(d) => <RecurringView recurring={d.recurring} />}</ScreenData>
    </div>
  );
}
