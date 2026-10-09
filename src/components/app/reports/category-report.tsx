"use client";
import { useMemo } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { Money } from "@/components/money";
import { CategoryIcon } from "@/components/app/category-icon";
import { SectionIcon } from "@/components/app/section-icon";
import { InteractiveCategoryDonut } from "@/components/app/interactive-category-donut";
import { formatPercent } from "@/lib/money";
import { DistributionTiles, type ReportsAnalytics } from "./shared";

export function CategoryReport({ a, title }: { a: ReportsAnalytics; title: string }) {
  const rows = a.categories;
  const totalSpend = useMemo(() => rows.reduce((s, c) => s + c.net, 0), [rows]);
  // Each category's own colour, as on the Dashboard — a category looks the
  // same on every chart and in every month.
  const donutData = rows.map((c) => ({
    name: c.name,
    value: c.net,
    color: c.color,
    icon: c.icon,
  }));

  if (rows.length === 0) {
    return (
      <Card>
        <CardBody>
          <EmptyState illustration={<SectionIcon section="reports" size={56} />} title="No spending recorded" description="Category breakdowns appear once you record expenses." />
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <DistributionTiles values={rows.map((c) => c.net)} unit="category" />

      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader title={title} subtitle="Effective spend" />
          <CardBody>
            {/* Each slice's own icon sits just outside the ring at its angle — a
                direct key instead of a color-swatch list to cross-reference. */}
            <InteractiveCategoryDonut data={donutData} height={300} total={totalSpend} totalLabel="Total spent" />
          </CardBody>
        </Card>

        <Card className="min-w-0 lg:col-span-3">
          <CardHeader title="Breakdown" subtitle={`${rows.length} categories`} />
          <CardBody className="px-0 py-0">
            <div className="overflow-x-auto">
              {/* table-fixed + an explicit width on every column except Category
                  makes Category the only flexible one, so its name actually
                  truncates to fit instead of forcing the whole table (and page)
                  wider than the viewport. Txns hides below sm — least essential
                  column, and the first to go on a narrow phone. */}
              <table className="w-full table-fixed text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted">
                    <th className="px-3 py-2.5 font-medium sm:px-5">Category</th>
                    <th className="hidden w-14 px-3 py-2.5 text-right font-medium sm:table-cell">Txns</th>
                    <th className="w-16 px-2 py-2.5 text-right font-medium sm:w-20 sm:px-3">% of spend</th>
                    <th className="w-28 px-2 py-2.5 text-right font-medium sm:w-32 sm:px-5">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((c) => (
                    <tr key={c.categoryId ?? "none"}>
                      <td className="min-w-0 px-3 py-2.5 sm:px-5">
                        <div className="flex min-w-0 items-center gap-2">
                          <CategoryIcon icon={c.icon} size={20} />
                          <span className="truncate text-fg">{c.name}</span>
                        </div>
                      </td>
                      <td className="hidden py-2.5 px-3 text-right tabular-nums text-muted sm:table-cell">{c.count}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-muted sm:px-3">
                        {totalSpend > 0 ? formatPercent((c.net / totalSpend) * 100) : "—"}
                      </td>
                      <td className="px-2 py-2.5 text-right sm:px-5">
                        <Money paise={c.net} tone="default" className="font-medium" />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border font-medium">
                    <td className="px-3 py-2.5 text-fg sm:px-5">Total</td>
                    <td className="hidden py-2.5 px-3 text-right tabular-nums text-muted sm:table-cell">
                      {rows.reduce((s, c) => s + c.count, 0)}
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-muted sm:px-3">100%</td>
                    <td className="px-2 py-2.5 text-right sm:px-5">
                      <Money paise={totalSpend} tone="default" className="font-semibold" />
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
