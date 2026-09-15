import type { Metadata } from "next";
import { AiSummaryCard } from "@/features/ai/ai-summary-card";
import { CategoryDonut } from "@/features/dashboard/category-donut";
import { Greeting } from "@/features/dashboard/greeting";
import { IncomeExpenseChart } from "@/features/dashboard/income-expense-chart";
import { MonthlyComparisonCard } from "@/features/dashboard/monthly-comparison-card";
import { RecentTransactions } from "@/features/dashboard/recent-transactions";
import { SummaryCards } from "@/features/dashboard/summary-cards";
import { MonthSelector } from "@/components/shared/month-selector";
import { getCachedInsight } from "@/lib/ai/insights";
import { getDashboardSummary } from "@/lib/analytics/queries";
import { loadAppContext, resolveMonthParam } from "@/lib/services/bootstrap";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const context = await loadAppContext();
  const month = resolveMonthParam(params.month, context.currentMonth);
  const [summary, cachedInsight] = await Promise.all([
    getDashboardSummary(context.userId, month),
    getCachedInsight(context.userId, "MONTHLY", month).catch(() => null),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <Greeting timeZone={context.settings.timeZone} month={month} currentMonth={context.currentMonth} />
        <MonthSelector month={month} currentMonth={context.currentMonth} />
      </div>

      <SummaryCards summary={summary} />

      <AiSummaryCard
        key={`ai-${month}`}
        month={month}
        initial={cachedInsight}
        hasData={summary.current.transactionCount > 0}
        aiEnabled={context.settings.aiEnabled}
        autoAnalyze={context.settings.aiAutoAnalyze}
      />

      <div className="grid gap-4 xl:grid-cols-5">
        <IncomeExpenseChart key={`chart-${month}`} month={month} initialSeries={summary.series} className="xl:col-span-3" />
        <CategoryDonut items={summary.expenseCategories} month={month} className="xl:col-span-2" />
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <RecentTransactions
          transactions={summary.recentTransactions}
          month={month}
          today={context.today}
          dateFormat={context.settings.dateFormat}
          className="xl:col-span-3"
        />
        <MonthlyComparisonCard comparison={summary.comparison} className="xl:col-span-2" />
      </div>
    </div>
  );
}
