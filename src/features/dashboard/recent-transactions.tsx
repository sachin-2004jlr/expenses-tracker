"use client";

import { Inbox } from "lucide-react";
import { AddTransactionButton } from "@/components/shared/add-transaction-button";
import { CategoryIcon } from "@/components/shared/category-icon";
import { EmptyState } from "@/components/shared/empty-state";
import { Amount } from "@/components/shared/money";
import { SectionCard, SectionLink } from "@/components/shared/section-card";
import { useTransactionDialog } from "@/features/transactions/transaction-dialog-provider";
import { relativeDayLabel } from "@/lib/dates";
import type { IsoDate, MonthKey, Transaction } from "@/types";

export interface RecentTransactionsProps {
  transactions: Transaction[];
  month: MonthKey;
  today: IsoDate;
  dateFormat: string;
  className?: string;
}

/** The latest income and expenses of the month. Tapping a row edits it. */
export function RecentTransactions({ transactions, month, today, dateFormat, className }: RecentTransactionsProps) {
  const { openEdit } = useTransactionDialog();

  return (
    <SectionCard
      title="Recent transactions"
      label="Recent transactions"
      action={transactions.length > 0 ? <SectionLink href={`/transactions?month=${month}`}>View all</SectionLink> : undefined}
      className={className}
    >
      {transactions.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No transactions yet"
          description="Add your first income or expense for this month."
          action={<AddTransactionButton size="sm" className="rounded-full" />}
          compact
        />
      ) : (
        <ul className="-mx-2 divide-y divide-border">
          {transactions.map((tx) => (
            <li key={tx.id}>
              <button
                type="button"
                onClick={() => openEdit(tx)}
                aria-label={`Edit ${tx.description}`}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                <CategoryIcon icon={tx.category.icon} color={tx.category.color} className="rounded-full" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-normal">{tx.description}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {tx.category.name} · {relativeDayLabel(tx.date, today, dateFormat)}
                  </span>
                </span>
                <Amount paise={tx.amount} type={tx.type} className="shrink-0 text-sm font-semibold" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
