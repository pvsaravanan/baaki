"use client";
import { useState } from "react";
import { CheckSquare } from "lucide-react";
import { usePageData } from "@/lib/local-api";
import { TransactionsView } from "@/components/app/transactions-view";
import { ScreenData } from "@/components/app/screen-data";

export default function TransactionsPage() {
  const { data, error } = usePageData("transactions");
  const [selectMode, setSelectMode] = useState(false);
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="min-w-0 text-[24px] font-bold leading-[30px] tracking-tight text-fg md:text-headline-lg">Transactions</h1>
        <button
          type="button"
          onClick={() => setSelectMode((on) => !on)}
          aria-pressed={selectMode}
          className="flex shrink-0 items-center gap-1 text-label-sm uppercase text-brand-hover"
        >
          <CheckSquare className="h-3.5 w-3.5" />
          {selectMode ? "Cancel" : "Select"}
        </button>
      </div>
      <p className="mb-3 mt-1 text-[12px] leading-4 text-muted md:mb-4 md:text-body-sm">Search, filter and manage every transaction.</p>
      <ScreenData data={data} error={error}>
        {(d) => <TransactionsView initialData={d} selectMode={selectMode} onSelectModeChange={setSelectMode} />}
      </ScreenData>
    </div>
  );
}
