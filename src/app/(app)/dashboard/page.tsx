import type { Metadata } from "next";
import { BudgetCard } from "@/features/budgets/budget-card";
import { BalanceChart } from "@/features/dashboard/balance-chart";
import { CategoryBreakdown } from "@/features/dashboard/category-breakdown";
import { MoneySummary } from "@/features/dashboard/money-summary";
import { RecentTransactions } from "@/features/dashboard/recent-transactions";
import { calculateBudgetProgress } from "@/lib/analytics/budgets";
import { getDashboardSummary } from "@/lib/analytics/queries";
import { currentHour, daysInMonth, formatMonthLabel, greetingForHour, parseIsoDate, parseMonthKey, previousMonthKey } from "@/lib/dates";
import { loadAppContext, resolveMonthParam } from "@/lib/services/bootstrap";
import { listBudgets } from "@/lib/services/budgets";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * The monthly money tracker at a glance: money left, recent transactions, where the money went
 * and budgets. Income and expenses only: savings live in their own section and never appear here.
 */
export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const context = await loadAppContext();
  const month = resolveMonthParam(params.month, context.currentMonth);
  const [summary, budgets] = await Promise.all([getDashboardSummary(context.userId, month, context.today), listBudgets(context.userId)]);

  const { year, month: monthNumber } = parseMonthKey(month);
  const isCurrent = month === context.currentMonth;
  const daysElapsed = isCurrent ? parseIsoDate(context.today).day : daysInMonth(year, monthNumber);
  const daysLeft = isCurrent ? daysInMonth(year, monthNumber) - parseIsoDate(context.today).day + 1 : null;
  const perDay = Math.round(summary.current.expenses / Math.max(1, daysElapsed));
  const monthLabel = formatMonthLabel(month);
  const shortMonth = formatMonthLabel(month, { style: "month-only" });
  const greeting = greetingForHour(currentHour(context.settings.timeZone));
  const budgetSummary = calculateBudgetProgress(budgets, summary.expenseCategories, context.categories);
  const count = summary.current.transactionCount;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{greeting}</h2>
        <p className="text-sm text-muted-foreground">
          {isCurrent ? "Here's this month so far" : `Looking back at ${monthLabel}`} · {count} transaction{count === 1 ? "" : "s"}
        </p>
      </div>

      <MoneySummary
        balance={summary.balance}
        carriedIn={summary.carriedIn}
        previousMonthLabel={formatMonthLabel(previousMonthKey(month), { style: "month-only" })}
        monthLabel={shortMonth}
        income={summary.current.income}
        expenses={summary.current.expenses}
        incomeChange={summary.comparison.income.changePercent}
        expensesChange={summary.comparison.expenses.changePercent}
        perDay={perDay}
        daysLeft={daysLeft}
      />

      {/* Phones: recent → categories → budgets → chart. Desktop: two columns. */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start lg:gap-6">
        <div className="contents lg:flex lg:flex-col lg:gap-6">
          <CategoryBreakdown items={summary.expenseCategories} month={month} monthLabel={shortMonth} className="order-2 lg:order-none" />
          <BalanceChart points={summary.dailyBalance} monthLabel={shortMonth} className="order-4 lg:order-none" />
        </div>
        <div className="contents lg:flex lg:flex-col lg:gap-6">
          <RecentTransactions
            transactions={summary.recentTransactions.slice(0, 6)}
            month={month}
            today={context.today}
            dateFormat={context.settings.dateFormat}
            className="order-1 lg:order-none"
          />
          <BudgetCard summary={budgetSummary} monthLabel={monthLabel} daysLeft={daysLeft} className="order-3 lg:order-none" />
        </div>
      </div>
    </div>
  );
}
