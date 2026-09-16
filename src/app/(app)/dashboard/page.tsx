import type { Metadata } from "next";
import { AiSummaryCard } from "@/features/ai/ai-summary-card";
import { BalanceHero } from "@/features/dashboard/balance-hero";
import { CategoryDonut } from "@/features/dashboard/category-donut";
import { ExpenseCard } from "@/features/dashboard/expense-card";
import { IncomeCard } from "@/features/dashboard/income-card";
import { MonthlyBars } from "@/features/dashboard/monthly-bars";
import { MonthlyComparisonCard } from "@/features/dashboard/monthly-comparison-card";
import { QuickActions } from "@/features/dashboard/quick-actions";
import { RecentOperations } from "@/features/dashboard/recent-operations";
import { SavingsGauge } from "@/features/dashboard/savings-gauge";
import { TopCategoryCard } from "@/features/dashboard/top-category-card";
import { getCachedInsight } from "@/lib/ai/insights";
import { getDashboardSummary } from "@/lib/analytics/queries";
import { currentHour, daysInMonth, formatMonthLabel, greetingForHour, parseIsoDate, parseMonthKey } from "@/lib/dates";
import { loadAppContext, resolveMonthParam } from "@/lib/services/bootstrap";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const context = await loadAppContext();
  const month = resolveMonthParam(params.month, context.currentMonth);
  const [summary, cachedInsight] = await Promise.all([
    getDashboardSummary(context.userId, month, context.today),
    getCachedInsight(context.userId, "MONTHLY", month).catch(() => null),
  ]);

  const { year, month: monthNumber } = parseMonthKey(month);
  const daysElapsed = month === context.currentMonth ? parseIsoDate(context.today).day : daysInMonth(year, monthNumber);
  const perDay = Math.round(summary.current.expenses / Math.max(1, daysElapsed));
  const monthLabel = formatMonthLabel(month);
  const greeting = greetingForHour(currentHour(context.settings.timeZone));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2 px-1">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">{month === context.currentMonth ? "This month" : "Viewing"}</p>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {greeting} <span aria-hidden>👋</span>
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {summary.current.transactionCount} transaction{summary.current.transactionCount === 1 ? "" : "s"} in {monthLabel}
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <BalanceHero
          className="xl:col-span-7"
          totalBalance={summary.totalBalance}
          openingBalance={summary.openingBalance}
          monthLabel={monthLabel}
          points={summary.dailyBalance}
          savings={summary.current.savings}
          savingsRate={summary.current.savingsRate}
          incomeChange={summary.comparison.income.changePercent}
        />
        <RecentOperations
          className="xl:col-span-3"
          transactions={summary.recentTransactions.slice(0, 6)}
          expenses={summary.current.expenses}
          perDay={perDay}
          month={month}
          today={context.today}
          dateFormat={context.settings.dateFormat}
        />
        <QuickActions month={month} className="content-start xl:col-span-2" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <IncomeCard amount={summary.current.income} changePercent={summary.comparison.income.changePercent} series={summary.series} />
        <ExpenseCard amount={summary.current.expenses} changePercent={summary.comparison.expenses.changePercent} series={summary.series} perDay={perDay} />
        <SavingsGauge rate={summary.current.savingsRate} savings={summary.current.savings} />
        <TopCategoryCard item={summary.expenseCategories[0] ?? null} month={month} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <MonthlyBars series={summary.series} currentMonth={month} />
        <CategoryDonut items={summary.expenseCategories} month={month} />
        <MonthlyComparisonCard comparison={summary.comparison} />
      </div>

      <AiSummaryCard
        key={`ai-${month}`}
        month={month}
        initial={cachedInsight}
        hasData={summary.current.transactionCount > 0}
        aiEnabled={context.settings.aiEnabled}
        autoAnalyze={context.settings.aiAutoAnalyze}
      />
    </div>
  );
}
