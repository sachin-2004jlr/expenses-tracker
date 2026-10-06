import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownToLine, ArrowUpFromLine, ArrowUpRight, NotebookPen, PiggyBank, Scale } from "lucide-react";
import { CategoryIcon } from "@/components/shared/category-icon";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { SavingsEntryList } from "@/features/savings/savings-entry-list";
import { SavingsAddButtons } from "@/features/savings/savings-shell";
import { percentChange } from "@/lib/analytics/calculations";
import { categoryColorValue } from "@/components/shared/category-icon";
import { formatMonthLabel } from "@/lib/dates";
import { formatCompactCurrency, formatCurrency, formatCurrencyParts, formatPercent } from "@/lib/money";
import { loadAppContext, resolveMonthParam } from "@/lib/services/bootstrap";
import { getSavingsOverview } from "@/lib/services/savings";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Savings" };

export default async function SavingsOverviewPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const context = await loadAppContext();
  const month = resolveMonthParam(params.month, context.currentMonth);
  const overview = await getSavingsOverview(context.userId, month, context.today);
  const monthLabel = formatMonthLabel(month);
  const net = overview.addedThisMonth - overview.usedThisMonth;
  const balance = formatCurrencyParts(overview.balance);
  const maxBar = Math.max(1, ...overview.series.flatMap((m) => [m.added, m.used]));
  const query = params.month ? `?month=${month}` : "";

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={monthLabel}
        title="Savings"
        description="Your savings, tracked on their own: what you put aside and what you did with it. None of this touches your monthly tracker."
        actions={<SavingsAddButtons />}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)]">
        <section className="flex min-w-0 flex-col justify-between rounded-2xl border border-saved/30 bg-card p-5 sm:p-6" aria-label="Savings balance">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-full bg-saved/15 text-saved-foreground">
              <PiggyBank className="size-4" aria-hidden />
            </span>
            <h2 className="text-lg font-semibold">Savings balance</h2>
          </div>
          <p className="mt-4 flex items-baseline gap-1 font-bold tracking-tight" data-testid="savings-balance">
            <span className={cn("text-4xl [overflow-wrap:anywhere]", overview.balance < 0 && "text-expense-foreground")}>
              {balance.sign}
              {balance.symbol}
              {balance.integer}
            </span>
            <span className="text-lg text-muted-foreground">.{balance.fraction}</span>
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            <span className="font-semibold text-income-foreground tabular-nums">{formatCurrency(overview.addedAllTime)}</span> added ·{" "}
            <span className="font-semibold text-saved-foreground tabular-nums">{formatCurrency(overview.usedAllTime)}</span> used, all time
          </p>
        </section>

        <section aria-label="This month" className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Added this month"
            icon={ArrowDownToLine}
            tone="income"
            value={formatCurrency(overview.addedThisMonth)}
            changePercent={percentChange(overview.addedThisMonth, overview.addedLastMonth)}
            increaseIsGood
          />
          <StatCard
            label="Used this month"
            icon={ArrowUpFromLine}
            tone="neutral"
            value={<span className="text-saved-foreground">{formatCurrency(overview.usedThisMonth)}</span>}
            changePercent={percentChange(overview.usedThisMonth, overview.usedLastMonth)}
            increaseIsGood={false}
          />
          <StatCard
            label="Net this month"
            icon={Scale}
            tone="neutral"
            value={<span className={net < 0 ? "text-expense-foreground" : undefined}>{net < 0 ? "−" : ""}{formatCurrency(Math.abs(net))}</span>}
            hint={net >= 0 ? "Your savings grew" : "You used more than you added"}
          />
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="min-w-0 rounded-2xl border border-border bg-card p-5" aria-label="Recent savings activity">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Recent savings activity</h2>
            <Link href={`/savings/entries${query}`} prefetch className="inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground">
              All entries <ArrowUpRight className="size-3" aria-hidden />
            </Link>
          </div>
          {overview.recentEntries.length === 0 ? (
            <EmptyState
              icon={PiggyBank}
              title="No savings recorded yet"
              description="Add what you put aside, then record what you did with it: gold, an FD, a trip."
              compact
              className="mt-4"
            />
          ) : (
            <div className="mt-2">
              <SavingsEntryList entries={overview.recentEntries} dateFormat={context.settings.dateFormat} />
            </div>
          )}
          {overview.entriesWithoutNotes.length > 0 && (
            <Link
              href={`/savings/journal${query}`}
              prefetch
              className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-saved/40 px-3 py-2 text-xs text-saved-foreground hover:bg-saved/10"
            >
              <NotebookPen className="size-3.5" aria-hidden />
              {overview.entriesWithoutNotes.length} recent entr{overview.entriesWithoutNotes.length === 1 ? "y has" : "ies have"} no note yet. Write what you did with it.
            </Link>
          )}
        </section>

        <div className="grid min-w-0 grid-cols-1 content-start gap-4">
          <section className="min-w-0 rounded-2xl border border-border bg-card p-5" aria-label="What you did with your savings">
            <h2 className="text-sm font-semibold">What you did with your savings</h2>
            <p className="text-xs text-muted-foreground">All time, by category</p>
            {overview.usedByCategory.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">Nothing used from savings yet.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {overview.usedByCategory.map((item) => (
                  <li key={item.categoryId}>
                    <div className="flex items-center gap-2">
                      <CategoryIcon icon={item.icon} color={item.color} size="sm" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.name}</span>
                      <span className="whitespace-nowrap text-sm font-semibold tabular-nums">{formatCurrency(item.amount)}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                        <span className="block h-full rounded-full" style={{ width: `${Math.max(2, item.percentage)}%`, background: categoryColorValue(item.color) }} />
                      </span>
                      <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                        {item.count}× · {formatPercent(item.percentage, 0)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="min-w-0 rounded-2xl border border-border bg-card p-5" aria-label="Savings per month">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Added vs used</h2>
              <span className="text-xs text-muted-foreground">last 12 months</span>
            </div>
            <ul className="mt-4 grid h-32 grid-cols-12 items-end gap-1" aria-label="Monthly savings in and out">
              {overview.series.map((m) => (
                <li
                  key={m.month}
                  className="flex h-full items-end justify-center gap-px"
                  title={`${formatMonthLabel(m.month, { style: "short" })}: +${formatCurrency(m.added)} / −${formatCurrency(m.used)}`}
                >
                  <span className={cn("w-1/2 rounded-t-sm", m.month === month ? "bg-income" : "bg-income/40")} style={{ height: `${m.added === 0 ? 2 : Math.max(5, (m.added / maxBar) * 100)}%` }} aria-hidden />
                  <span className={cn("w-1/2 rounded-t-sm", m.month === month ? "bg-saved" : "bg-saved/40")} style={{ height: `${m.used === 0 ? 2 : Math.max(5, (m.used / maxBar) * 100)}%` }} aria-hidden />
                  <span className="sr-only">
                    {formatMonthLabel(m.month)}: added {formatCurrency(m.added)}, used {formatCurrency(m.used)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex flex-wrap justify-between gap-2 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-sm bg-income" aria-hidden /> Added
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-sm bg-saved" aria-hidden /> Used
                </span>
              </span>
              <span>Balance {formatCompactCurrency(overview.series[overview.series.length - 1]?.balance ?? 0)} at end of {formatMonthLabel(month, { style: "short" })}</span>
            </div>
          </section>

          {overview.goals.length > 0 && (
            <section className="min-w-0 rounded-2xl border border-border bg-card p-5" aria-label="Goals">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Goals</h2>
                <Link href={`/savings/goals${query}`} prefetch className="inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground">
                  All goals <ArrowUpRight className="size-3" aria-hidden />
                </Link>
              </div>
              <ul className="mt-3 space-y-3">
                {overview.goals.slice(0, 4).map((goal) => (
                  <li key={goal.id}>
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate font-medium">{goal.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {formatCurrency(goal.saved)} / {formatCurrency(goal.targetAmount)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, goal.percentage)}%`, background: categoryColorValue(goal.color) }} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
