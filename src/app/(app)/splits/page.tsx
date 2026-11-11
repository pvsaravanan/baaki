"use client";
import { usePageData } from "@/lib/local-api";
import { BackButton } from "@/components/app/back-button";
import { ScreenData } from "@/components/app/screen-data";
import { SplitsView } from "@/components/app/splits-view";
import { ToCollectArt } from "@/components/app/page-illustrations";

export default function SplitsPage() {
  const { data, error, mutate } = usePageData("splits");
  return (
    <div>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <BackButton />
            <h1 className="text-headline-md text-fg sm:text-headline-lg">To collect</h1>
          </div>
          <p className="mt-1 text-body-sm text-muted">Money people owe you from split expenses.</p>
        </div>
        <ToCollectArt />
      </div>
      <ScreenData data={data} error={error}>
        {(d) => <SplitsView open={d.open} settled={d.settled} onChanged={() => void mutate()} />}
      </ScreenData>
    </div>
  );
}
