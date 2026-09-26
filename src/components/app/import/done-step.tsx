import Link from "next/link";
import { CheckCircle2, Table2, Upload } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import type { ImportSummary } from "./types";

export function DoneStep({ summary, onReset }: { summary: ImportSummary; onReset: () => void }) {
  const imported = summary.imported ?? summary.willImport;
  return (
    <Card>
      <CardBody>
        <EmptyState
          icon={<CheckCircle2 className="h-6 w-6 text-income" />}
          title={`Imported ${imported} transaction${imported === 1 ? "" : "s"}`}
          description={
            summary.duplicates > 0
              ? `${summary.duplicates} duplicate${summary.duplicates === 1 ? "" : "s"} were skipped.`
              : "Your transactions are now available in baaki."
          }
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/transactions">
                <Button>
                  <Table2 className="h-4 w-4" />
                  View transactions
                </Button>
              </Link>
              <Button variant="outline" onClick={onReset}>
                <Upload className="h-4 w-4" />
                Import another
              </Button>
            </div>
          }
        />
      </CardBody>
    </Card>
  );
}
