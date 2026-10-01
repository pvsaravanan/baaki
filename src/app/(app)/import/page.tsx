import { PageHeader } from "@/components/app/page-header";
import { ImportView } from "@/components/app/import-view";

export const metadata = { title: "Import · baaki" };

export default function ImportPage() {
  return (
    <div>
      <PageHeader title="Import transactions" description="Bring in transactions from a CSV file." />
      <ImportView />
    </div>
  );
}
