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
    <div className="space-y-5">
      <PageHeader
        title="Transactions"
        description={
          result.total === 0 ? (
            "Every income and expense in one place."
          ) : (
            <span className="flex flex-wrap gap-x-4 gap-y-1">
              <span>
                Income <Amount paise={result.totals.income} className="font-medium text-income-foreground" />
              </span>
              <span>
                Expenses <Amount paise={result.totals.expenses} className="font-medium text-expense-foreground" />
              </span>
              {result.totals.saved > 0 && (
                <span>
                  Saved <Amount paise={result.totals.saved} className="font-medium text-saved-foreground" />
                </span>
              )}
              <span>
                Net <Amount paise={result.totals.net} colorBySign className="font-medium" />
              </span>
            </span>
          )
        }
        actions={<AddTransactionButton />}
      />

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
