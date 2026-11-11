"use client";
import { usePageData } from "@/lib/local-api";
import { PageBanner } from "@/components/app/page-banner";
import { ScreenData } from "@/components/app/screen-data";
import { SplitsView } from "@/components/app/splits-view";
import { ToCollectArt } from "@/components/app/page-illustrations";

export default function SplitsPage() {
  const { data, error, mutate } = usePageData("splits");
  return (
    <div>
      <PageBanner
        title="To collect"
        subtitle="Money people owe you from split expenses."
        art={<ToCollectArt />}
      />
      <ScreenData data={data} error={error}>
        {(d) => <SplitsView open={d.open} settled={d.settled} onChanged={() => void mutate()} />}
      </ScreenData>
    </div>
  );
}
