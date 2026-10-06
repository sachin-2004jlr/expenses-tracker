"use client";

import Link from "next/link";
import { Inbox, SlidersHorizontal } from "lucide-react";
import { AddTransactionButton } from "@/components/shared/add-transaction-button";
import { CategoryIcon } from "@/components/shared/category-icon";
import { EmptyState } from "@/components/shared/empty-state";
import { Amount } from "@/components/shared/money";
import { useTransactionDialog } from "@/features/transactions/transaction-dialog-provider";
import { relativeDayLabel } from "@/lib/dates";
import { formatCurrency, formatCurrencyParts } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { IsoDate, MonthKey, Transaction } from "@/types";

export interface RecentOperationsProps {
  transactions: Transaction[];
  expenses: number;
  perDay: number;
  month: MonthKey;
  today: IsoDate;
  dateFormat: string;
  className?: string;
}

/** "Recent operations" list: spend headline, then rows that glow orange on hover. Click edits. */
export function RecentOperations({ transactions, expenses, perDay, month, today, dateFormat, className }: RecentOperationsProps) {
  const { openEdit } = useTransactionDialog();
  const parts = formatCurrencyParts(expenses);

  return (
    <section className={cn("flex min-w-0 flex-col rounded-2xl border border-border bg-card p-5", className)} aria-label="Recent transactions">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">Recent activity</h2>
          <p className="mt-2 flex items-baseline gap-1 font-bold tracking-tight">
            <span className="text-2xl">
              {parts.symbol}
              {parts.integer}
            </span>
            <span className="text-sm text-muted-foreground">.{parts.fraction}</span>
          </p>
          <p className="text-xs text-muted-foreground">spent this month · {formatCurrency(perDay)} / day</p>
        </div>
        <Link
          href={`/transactions?month=${month}`}
          aria-label="Open all transactions"
          className="flex size-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <SlidersHorizontal className="size-4" aria-hidden />
        </Link>
      </div>

      {transactions.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No transactions yet"
          description="Start by adding your first income or expense for this month."
          action={<AddTransactionButton size="sm" />}
          compact
          className="mt-4"
        />
      ) : (
        <ul className="mt-4 -mx-2 space-y-0.5">
          {transactions.map((tx) => (
            <li key={tx.id}>
              <button
                type="button"
                onClick={() => openEdit(tx)}
                aria-label={`Edit ${tx.description}`}
                className="group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-[linear-gradient(90deg,color-mix(in_oklch,var(--brand)_18%,transparent),transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                <CategoryIcon icon={tx.category.icon} color={tx.category.color} className="rounded-full" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{tx.description}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {tx.type === "INCOME" ? "Received" : "Spent"} · {relativeDayLabel(tx.date, today, dateFormat)} · {tx.category.name}
                  </span>
                </span>
                <Amount paise={tx.amount} type={tx.type} className="shrink-0 text-sm font-semibold" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {transactions.length > 0 && (
        <Link href={`/transactions?month=${month}`} prefetch className="mt-3 text-center text-xs font-medium text-muted-foreground hover:text-foreground">
          View all transactions
        </Link>
      )}
    </section>
  );
}
