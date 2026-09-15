import Link from "next/link";
import { ArrowRight, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AddTransactionButton } from "@/components/shared/add-transaction-button";
import { EmptyState } from "@/components/shared/empty-state";
import { TransactionListItem } from "@/features/transactions/transaction-list-item";
import { formatMonthLabel } from "@/lib/dates";
import type { IsoDate, MonthKey, Transaction } from "@/types";

export function RecentTransactions({
  transactions,
  month,
  today,
  dateFormat,
  className,
}: {
  transactions: Transaction[];
  month: MonthKey;
  today: IsoDate;
  dateFormat: string;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Recent transactions</CardTitle>
        <CardDescription>Latest activity in {formatMonthLabel(month)}</CardDescription>
        <CardAction>
          <Button variant="ghost" size="sm" render={<Link href={`/transactions?month=${month}`} />}>
            View all
            <ArrowRight data-icon="inline-end" aria-hidden />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No transactions yet"
            description="Start by adding your first income or expense for this month."
            action={<AddTransactionButton size="sm" />}
            compact
          />
        ) : (
          <ul className="-mx-2 divide-y divide-border/70">
            {transactions.map((transaction) => (
              <li key={transaction.id}>
                <TransactionListItem transaction={transaction} today={today} dateFormat={dateFormat} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
