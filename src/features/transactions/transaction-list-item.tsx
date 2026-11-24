"use client";

import { CategoryIcon } from "@/components/shared/category-icon";
import { Amount } from "@/components/shared/money";
import { formatIsoDate, relativeDayLabel } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { IsoDate, Transaction } from "@/types";
import { useTransactionDialog } from "./transaction-dialog-provider";

export interface TransactionListItemProps {
  transaction: Transaction;
  today: IsoDate;
  dateFormat?: string;
  /** Show "Today / Yesterday" instead of the raw date when applicable. */
  relativeDates?: boolean;
  showDate?: boolean;
  className?: string;
}

/** Compact, tappable row used on the dashboard and calendar. Click opens the edit dialog. */
export function TransactionListItem({
  transaction,
  today,
  dateFormat = "dd MMM yyyy",
  relativeDates = true,
  showDate = true,
  className,
}: TransactionListItemProps) {
  const { openEdit } = useTransactionDialog();
  const dateLabel = relativeDates ? relativeDayLabel(transaction.date, today, dateFormat) : formatIsoDate(transaction.date, dateFormat);

  return (
    <button
      type="button"
      onClick={() => openEdit(transaction)}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
        className,
      )}
      aria-label={`Edit ${transaction.description}`}
    >
      <CategoryIcon icon={transaction.category.icon} color={transaction.category.color} />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 hyphens-auto break-words text-sm font-medium">{transaction.description}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {transaction.category.name}
          {showDate && <> · {dateLabel}</>}
          {transaction.tags.length > 0 && <> · {transaction.tags.map((t) => `#${t.name}`).join(" ")}</>}
        </span>
      </span>
      <Amount paise={transaction.amount} type={transaction.type} className="shrink-0 whitespace-nowrap text-sm font-semibold" />
    </button>
  );
}
