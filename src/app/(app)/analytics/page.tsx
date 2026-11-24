import type { Metadata } from "next";
import { ArrowDownRight, ArrowUpRight, Scale, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { AnalyticsRange } from "@/features/analytics/analytics-range";
import { CategoryBars } from "@/features/analytics/category-bars";
import { LargestExpenses } from "@/features/analytics/largest-expenses";
import { TrendChart } from "@/features/analytics/trend-chart";
import { CategoryDonut } from "@/features/dashboard/category-donut";
import { MonthlyComparisonCard } from "@/features/dashboard/monthly-comparison-card";
import { getAnalyticsOverview } from "@/lib/analytics/queries";
import { formatMonthLabel, monthRange } from "@/lib/dates";
import { formatCurrency, formatPercent } from "@/lib/money";
import { loadAppContext, resolveMonthParam } from "@/lib/services/bootstrap";
import type { RangePreset } from "@/types";

export const metadata: Metadata = { title: "Analytics" };

const RANGE_LABEL: Record<RangePreset, string> = { "3m": "last 3 months", "6m": "last 6 months", "12m": "last 12 months", all: "all time" };

function parseRange(value: string | string[] | undefined): RangePreset {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate === "3m" || candidate === "12m" || candidate === "all" ? candidate : "6m";
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const context = await loadAppContext();
  const month = resolveMonthParam(params.month, context.currentMonth);
  const range = parseRange(params.range);
  const overview = await getAnalyticsOverview(context.userId, range, month);
  const first = overview.months[0]!;
  const last = overview.months[overview.months.length - 1]!;
  const linkQuery = `&from=${monthRange(first).start}&to=${monthRange(last).end}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        eyebrow={`${formatMonthLabel(first, { style: "short" })} – ${formatMonthLabel(last, { style: "short" })}`}
        description={`Your money over the ${RANGE_LABEL[range]}. Clear and simple.`}
        actions={<AnalyticsRange value={range} />}
      />

      <section aria-label="Range totals" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Total income" icon={ArrowUpRight} tone="income" value={formatCurrency(overview.totals.income)} hint={`Avg ${formatCurrency(overview.averages.income)} / month`} />
        <StatCard label="Total expenses" icon={ArrowDownRight} tone="expense" value={formatCurrency(overview.totals.expenses)} hint={`Avg ${formatCurrency(overview.averages.expenses)} / month`} />
        <StatCard
          label="Net"
          icon={Scale}
          tone="neutral"
          value={formatCurrency(overview.totals.net)}
          hint={overview.totals.netRate === null ? "Income minus expenses" : `${formatPercent(overview.totals.netRate)} of income left over`}
          className={overview.totals.net < 0 ? "[&>p:nth-child(2)]:text-expense-foreground" : undefined}
        />
        <StatCard
          label="Best month"
          icon={TrendingUp}
          tone="neutral"
          value={overview.bestMonth ? formatMonthLabel(overview.bestMonth.month, { style: "short" }) : "—"}
          hint={
            overview.bestMonth
              ? `Most left over: ${formatCurrency(overview.bestMonth.net)}`
              : "Add transactions to see trends"
          }
        />
      </section>

      <TrendChart series={overview.series} />

      <div className="grid gap-4 lg:gap-6 xl:grid-cols-2">
        <CategoryDonut
          items={overview.expenseCategories}
          month={month}
          title="Category spending"
          description={`Share of expenses, ${RANGE_LABEL[range]}`}
          linkBase="/transactions"
        />
        <CategoryBars items={overview.incomeCategories} type="INCOME" title="Income sources" description={`Where income came from, ${RANGE_LABEL[range]}`} linkQuery={linkQuery} />
      </div>

      <div className="grid gap-4 lg:gap-6 xl:grid-cols-2">
        <LargestExpenses transactions={overview.largestExpenses} today={context.today} dateFormat={context.settings.dateFormat} />
        <MonthlyComparisonCard comparison={overview.comparison} />
      </div>
    </div>
  );
}
