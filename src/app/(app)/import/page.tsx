import { BackButton } from "@/components/app/back-button";
import { ImportView } from "@/components/app/import-view";
import { ImportArt } from "@/components/app/page-illustrations";

export const metadata = { title: "Import · baaki" };

export default function ImportPage() {
  return (
    <div>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <BackButton />
            <h1 className="text-headline-md text-fg sm:text-headline-lg">Import transactions</h1>
          </div>
          <p className="mt-1 text-body-sm text-muted">Bring in transactions from a CSV file.</p>
        </div>
        <ImportArt />
      </div>
      <ImportView />
    </div>
  );
}
