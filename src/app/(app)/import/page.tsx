import { PageBanner } from "@/components/app/page-banner";
import { ImportView } from "@/components/app/import-view";
import { ImportArt } from "@/components/app/page-illustrations";

export const metadata = { title: "Import · baaki" };

export default function ImportPage() {
  return (
    <div>
      <PageBanner
        title="Import"
        subtitle="Bring in a bank statement as a CSV or Excel file."
        art={<ImportArt />}
      />
      <ImportView />
    </div>
  );
}
