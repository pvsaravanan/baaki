import { requireUserOrRedirect } from "@/lib/auth";
import { countTransactions, loadTransactionTotals, loadTransactions } from "@/lib/queries";
import { PageHeader } from "@/components/app/page-header";
import { TransactionsView } from "@/components/app/transactions-view";

export const metadata = { title: "Transactions · baaki" };

export default async function TransactionsPage() {
  const user = await requireUserOrRedirect();
  const [initialTransactions, total, totals] = await Promise.all([
    loadTransactions(user.id, { take: 50 }),
    countTransactions(user.id),
    loadTransactionTotals(user.id),
  ]);

  return (
    <div>
      <PageHeader title="Transactions" description="Search, filter and manage every transaction." />
      <TransactionsView initialData={{ transactions: initialTransactions, total, totals }} />
    </div>
  );
}

