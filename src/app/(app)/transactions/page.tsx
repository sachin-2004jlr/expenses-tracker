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
    <div className="page-enter space-y-6">
      <PageHeader
        title="Transactions"
        description="Every income and expense you have recorded. Tap a row to edit it."
        actions={<AddTransactionButton className="rounded-full" />}
      />

      {/* Phones: one card of full-width rows, so long amounts are never cut. Wider: three tiles. */}
      {result.total > 0 && (
        <dl
          className="overflow-hidden rounded-2xl border border-border bg-card sm:grid sm:grid-cols-3 sm:gap-3 sm:overflow-visible sm:rounded-none sm:border-0 sm:bg-transparent"
          aria-label="Totals for these transactions"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-0 sm:block sm:rounded-2xl sm:border sm:bg-card sm:p-4 sm:last:border">
            <dt className="text-sm text-muted-foreground sm:text-xs">Income</dt>
            <dd className="whitespace-nowrap text-base font-bold sm:mt-1 sm:text-sm lg:text-lg">
              <Amount paise={result.totals.income} className="text-income-foreground" />
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-0 sm:block sm:rounded-2xl sm:border sm:bg-card sm:p-4 sm:last:border">
            <dt className="text-sm text-muted-foreground sm:text-xs">Expenses</dt>
            <dd className="whitespace-nowrap text-base font-bold sm:mt-1 sm:text-sm lg:text-lg">
              <Amount paise={result.totals.expenses} className="text-expense-foreground" />
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-0 sm:block sm:rounded-2xl sm:border sm:bg-card sm:p-4 sm:last:border">
            <dt className="text-sm text-muted-foreground sm:text-xs">Net</dt>
            <dd className="whitespace-nowrap text-base font-bold sm:mt-1 sm:text-sm lg:text-lg">
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
