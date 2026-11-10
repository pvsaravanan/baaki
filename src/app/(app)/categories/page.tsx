"use client";
import { usePageData } from "@/lib/local-api";
import { BackButton } from "@/components/app/back-button";
import { CategoriesView } from "@/components/app/categories-view";
import { ScreenData } from "@/components/app/screen-data";

/** Decoration only: a small stack of category cards. */
function CardStack() {
  return (
    <svg aria-hidden viewBox="0 0 120 90" className="h-[76px] w-[100px] shrink-0 text-fg sm:h-[90px] sm:w-[120px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 88 C4 50 32 22 72 18 H118 V88 Z" fill="hsl(var(--brand-soft))" stroke="none" />
      <path d="M36 16 L31 10 M26 26 L19 23 M48 11 L46 4" />
      <rect x="44" y="50" width="62" height="36" rx="6" transform="rotate(-3 75 68)" fill="hsl(var(--surface))" />
      <rect x="24" y="42" width="66" height="36" rx="6" fill="hsl(var(--surface))" />
      <path d="M40 67 V60 L45 54 H59 L66 60 H72 V67 Z" fill="#e0603a" />
      <circle cx="47" cy="68" r="3.5" fill="hsl(var(--surface))" />
      <circle cx="65" cy="68" r="3.5" fill="hsl(var(--surface))" />
      <rect x="62" y="8" width="52" height="40" rx="6" transform="rotate(8 88 28)" fill="hsl(var(--surface))" />
      <path d="M74 30 H102 C102 38 96 42 88 42 C80 42 74 38 74 30 Z M72 30 H104" fill="#f2b84b" transform="rotate(8 88 28)" />
      <path d="M81 25 C79 22 83 20 81 16 M88 25 C86 22 90 20 88 16 M95 25 C93 22 97 20 95 16" strokeWidth="1.5" transform="rotate(8 88 28)" />
    </svg>
  );
}

export default function CategoriesPage() {
  const { data, error } = usePageData("categories");
  return (
    <div>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <BackButton />
            <h1 className="text-headline-md text-fg sm:text-headline-lg">Categories</h1>
          </div>
          <p className="mt-1 text-body-sm text-muted">Manage your expense and income categories.</p>
        </div>
        <CardStack />
      </div>
      <ScreenData data={data} error={error}>
        {(d) => <CategoriesView categories={d.categories} transactionCounts={d.transactionCounts} />}
      </ScreenData>
    </div>
  );
}
