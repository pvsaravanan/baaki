"use client";
import { useState } from "react";
import { CheckSquare } from "lucide-react";
import { usePageData } from "@/lib/local-api";
import { TransactionsView } from "@/components/app/transactions-view";
import { ScreenData } from "@/components/app/screen-data";
import { PageBanner } from "@/components/app/page-banner";
import { TransactionsArt } from "@/components/app/page-illustrations";
import { cn } from "@/lib/cn";

export default function TransactionsPage() {
  const { data, error } = usePageData("transactions");
  const [selectMode, setSelectMode] = useState(false);
  return (
    <div>
      <PageBanner
        back={false}
        title="Transactions"
        subtitle="Search, filter and manage every transaction."
        art={<TransactionsArt />}
      >
        <button
          type="button"
          onClick={() => setSelectMode((on) => !on)}
          aria-pressed={selectMode}
          className={cn(
            "mt-3 inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3.5 text-sm font-bold transition-colors",
            selectMode ? "bg-brand text-brand-fg" : "text-fg",
          )}
        >
          <CheckSquare className="h-4 w-4" />
          {selectMode ? "Cancel" : "Select"}
        </button>
      </PageBanner>
      <ScreenData data={data} error={error}>
        {(d) => <TransactionsView initialData={d} selectMode={selectMode} onSelectModeChange={setSelectMode} />}
      </ScreenData>
    </div>
  );
}
