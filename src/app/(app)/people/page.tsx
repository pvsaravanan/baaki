"use client";
import { usePageData } from "@/lib/local-api";
import { PageHeader } from "@/components/app/page-header";
import { PeopleView } from "@/components/app/people-view";
import { ScreenData } from "@/components/app/screen-data";

export default function PeoplePage() {
  const { data, error } = usePageData("people");
  return (
    <div>
      <PageHeader title="People" description="Track shared expenses and settle up." />
      <ScreenData data={data} error={error}>{(d) => <PeopleView contacts={d.contacts} someone={d.someone} />}</ScreenData>
    </div>
  );
}
