import { ArrowDownRight, ArrowUpRight, PiggyBank, Wallet } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { formatCurrency, formatPercent } from "@/lib/money";
import type { DashboardSummary } from "@/types";

export function SummaryCards({ summary }: { summary: DashboardSummary }) {
  const { current, comparison } = summary;
  return (
    <section aria-label="Financial summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Total balance"
        icon={Wallet}
        tone="neutral"
        value={formatCurrency(summary.totalBalance)}
        hint="All-time income minus all-time expenses"
        className={summary.totalBalance < 0 ? "[&>p]:text-expense-foreground" : undefined}
      />
      <StatCard
        label="Income"
        icon={ArrowUpRight}
        tone="income"
        value={formatCurrency(current.income)}
        changePercent={comparison.income.changePercent}
        increaseIsGood
      />
      <StatCard
        label="Expenses"
        icon={ArrowDownRight}
        tone="expense"
        value={formatCurrency(current.expenses)}
        changePercent={comparison.expenses.changePercent}
        increaseIsGood={false}
      />
      <StatCard
        label="Savings"
        icon={PiggyBank}
        tone="savings"
        value={formatCurrency(current.savings)}
        changePercent={comparison.savings.changePercent}
        increaseIsGood
        hint={
          current.savingsRate === null ? (
            "Savings rate needs income"
          ) : (
            <>
              Savings rate <span className="font-medium text-foreground">{formatPercent(current.savingsRate)}</span>
            </>
          )
        }
        className={current.savings < 0 ? "[&>p]:text-expense-foreground" : undefined}
      />
    </section>
  );
}
