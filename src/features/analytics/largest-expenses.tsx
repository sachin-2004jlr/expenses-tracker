import { Receipt } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { TransactionListItem } from "@/features/transactions/transaction-list-item";
import type { IsoDate, Transaction } from "@/types";

export function LargestExpenses({
  transactions,
  today,
  dateFormat,
  className,
}: {
  transactions: Transaction[];
  today: IsoDate;
  dateFormat: string;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Largest expenses</CardTitle>
        <CardDescription>Biggest single payments in this range</CardDescription>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <EmptyState icon={Receipt} title="No expenses in this range" compact />
        ) : (
          <ol className="-mx-2 divide-y divide-border/70">
            {transactions.map((tx, index) => (
              <li key={tx.id} className="flex items-center">
                <span className="w-6 shrink-0 pl-2 text-xs text-muted-foreground tabular-nums">{index + 1}.</span>
                <div className="min-w-0 flex-1">
                  <TransactionListItem transaction={tx} today={today} dateFormat={dateFormat} relativeDates={false} />
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
