import type { Metadata } from "next";
import { AddTransactionButton } from "@/components/shared/add-transaction-button";
import { Amount } from "@/components/shared/money";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/features/transactions/pagination";
import { TransactionFiltersBar } from "@/features/transactions/transaction-filters";
import { TransactionTable } from "@/features/transactions/transaction-table";
import { loadAppContext } from "@/lib/services/bootstrap";
import { listTagsWithCounts } from "@/lib/services/tags";
import { listTransactions } from "@/lib/services/transactions";
import { parseTransactionFilters } from "@/lib/validation/transaction";

export const metadata: Metadata = { title: "Transactions" };

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const filters = parseTransactionFilters(params);
  const context = await loadAppContext();
  const [result, tags] = await Promise.all([listTransactions(context.userId, filters), listTagsWithCounts(context.userId)]);

  const hasFilters = Boolean(
    filters.q || filters.type || filters.category || filters.month || filters.from || filters.to || filters.min !== null || filters.max !== null || filters.tags.length > 0,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        description="Every income and expense you have recorded. Tap a row to edit it."
        actions={<AddTransactionButton className="rounded-full" />}
      />

      {result.total > 0 && (
        <dl className="grid grid-cols-3 gap-2 sm:gap-3" aria-label="Totals for these transactions">
          <div className="min-w-0 rounded-2xl border border-border bg-card p-3 sm:p-4">
            <dt className="text-xs text-muted-foreground">Income</dt>
            <dd className="mt-1 truncate text-sm font-bold sm:text-lg">
              <Amount paise={result.totals.income} className="text-income-foreground" />
            </dd>
          </div>
          <div className="min-w-0 rounded-2xl border border-border bg-card p-3 sm:p-4">
            <dt className="text-xs text-muted-foreground">Expenses</dt>
            <dd className="mt-1 truncate text-sm font-bold sm:text-lg">
              <Amount paise={result.totals.expenses} className="text-expense-foreground" />
            </dd>
          </div>
          <div className="min-w-0 rounded-2xl border border-border bg-card p-3 sm:p-4">
            <dt className="text-xs text-muted-foreground">Net</dt>
            <dd className="mt-1 truncate text-sm font-bold sm:text-lg">
              <Amount paise={result.totals.net} colorBySign />
            </dd>
          </div>
        </dl>
      )}

      <TransactionFiltersBar filters={filters} categories={context.categories} tags={tags} month={filters.month} />

      <TransactionTable
        transactions={result.items}
        sort={filters.sort}
        dir={filters.dir}
        dateFormat={context.settings.dateFormat}
        hasFilters={hasFilters}
      />

      <Pagination page={result.page} pageCount={result.pageCount} total={result.total} pageSize={result.pageSize} />
    </div>
  );
}
