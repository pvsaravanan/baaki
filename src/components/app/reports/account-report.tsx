"use client";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { Money } from "@/components/money";
import { AccountIcon } from "@/components/app/accounts/account-icon";
import { SectionIcon } from "@/components/app/section-icon";
import { useAppData } from "@/components/app/app-data";
import { formatAccountType } from "@/lib/constants";
import { Tile, type PerAccountRow } from "./shared";

export function AccountReport({ perAccount }: { perAccount: PerAccountRow[] }) {
  const { accounts } = useAppData();
  const active = accounts.filter((acc) => !acc.isArchived);
  const spendById = new Map(perAccount.map((p) => [p.accountId, p]));
  const totalBalance = active.reduce((s, acc) => s + acc.balance, 0);

  if (active.length === 0) {
    return (
      <Card>
        <CardBody>
          <EmptyState illustration={<SectionIcon section="reports" size={56} />} title="No accounts yet" description="Add an account to see balances here." />
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Total balance">
          <Money paise={totalBalance} tone={totalBalance >= 0 ? "default" : "expense"} />
        </Tile>
        <Tile label="Accounts" hint="active">
          <span className="tabular-nums">{active.length}</span>
        </Tile>
      </div>

      <Card>
        <CardHeader title="Accounts" subtitle="Balances and period activity" />
        <CardBody className="px-0 py-0">
          <div className="overflow-x-auto">
            {/* table-fixed + an explicit width on every column but Account
                keeps Account as the only flexible one, so a long name
                truncates instead of forcing the table (and page) wider than
                the viewport. Type/Txns hide below sm — the least essential
                columns, and the first to go on a narrow phone. Every row
                (including the footer) keeps the same cells with the same
                hidden classes so column counts always line up — no colSpan
                arithmetic to keep in sync with what's hidden. */}
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="px-3 py-2.5 font-medium sm:px-5">Account</th>
                  <th className="hidden w-28 px-3 py-2.5 font-medium sm:table-cell">Type</th>
                  <th className="w-24 px-2 py-2.5 text-right font-medium sm:w-28 sm:px-3">Spent</th>
                  <th className="hidden w-14 px-3 py-2.5 text-right font-medium sm:table-cell">Txns</th>
                  <th className="w-24 px-2 py-2.5 text-right font-medium sm:w-32 sm:px-5">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {active.map((acc) => {
                  const p = spendById.get(acc.id);
                  return (
                    <tr key={acc.id}>
                      <td className="min-w-0 px-3 py-2.5 sm:px-5">
                        <div className="flex min-w-0 items-center gap-2">
                          <AccountIcon account={acc} size={20} />
                          <span className="truncate text-fg">{acc.name}</span>
                        </div>
                      </td>
                      <td className="hidden py-2.5 px-3 text-muted sm:table-cell">{formatAccountType(acc.type)}</td>
                      <td className="px-2 py-2.5 text-right sm:px-3">
                        <Money paise={Math.max(0, p?.expense ?? 0)} tone={p && p.expense > 0 ? "expense" : "muted"} />
                      </td>
                      <td className="hidden py-2.5 px-3 text-right tabular-nums text-muted sm:table-cell">{p?.count ?? 0}</td>
                      <td className="px-2 py-2.5 text-right sm:px-5">
                        <Money paise={acc.balance} tone={acc.balance >= 0 ? "default" : "expense"} className="font-medium" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-border font-medium">
                  <td className="px-3 py-2.5 text-fg sm:px-5">Total balance</td>
                  <td className="hidden sm:table-cell" />
                  <td className="px-2 py-2.5 sm:px-3" />
                  <td className="hidden sm:table-cell" />
                  <td className="px-2 py-2.5 text-right sm:px-5">
                    <Money paise={totalBalance} tone="default" className="font-semibold" />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
