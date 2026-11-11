import { PageBanner } from "@/components/app/page-banner";
import { ImportView } from "@/components/app/import-view";
import { ImportArt } from "@/components/app/page-illustrations";

export const metadata = { title: "Import · baaki" };

export default function ImportPage() {
  return (
    <div>
      <PageBanner
        title="Import transactions"
        subtitle="Bring in transactions from a CSV file."
        art={<ImportArt />}
      />
      <ImportView />
    </div>
  );
}
