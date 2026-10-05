import type { Metadata } from "next";
import { CircleDashed, Landmark, PiggyBank, Wallet } from "lucide-react";
import { AddTransactionButton } from "@/components/shared/add-transaction-button";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { CategoryBars } from "@/features/analytics/category-bars";
import { SavingsGoals } from "@/features/savings/savings-goals";
import { SavingsJournal } from "@/features/savings/savings-journal";
import { percentChange } from "@/lib/analytics/calculations";
import { formatMonthLabel } from "@/lib/dates";
import { formatCompactCurrency, formatCurrency, formatPercent } from "@/lib/money";
import { loadAppContext, resolveMonthParam } from "@/lib/services/bootstrap";
import { getSavingsOverview } from "@/lib/services/savings";
import { listSavingsNotes } from "@/lib/services/savings-notes";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Savings" };

export default async function SavingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const context = await loadAppContext();
  const month = resolveMonthParam(params.month, context.currentMonth);
  const [overview, notes] = await Promise.all([getSavingsOverview(context.userId, month, context.today), listSavingsNotes(context.userId)]);
  const monthLabel = formatMonthLabel(month);
  const destinations = context.categories.filter((c) => c.type === "SAVINGS");
  const maxSaved = Math.max(1, ...overview.series.map((m) => m.saved));
  const unallocated = overview.unallocatedThisMonth;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={monthLabel}
        title="Savings"
        description="Money you set aside, where it is kept, your goals, and your notes about it."
        actions={<AddTransactionButton defaults={{ type: "SAVINGS" }} label="Add savings" className="bg-saved text-white hover:bg-saved/90" data-testid="add-savings" />}
      />

      <section aria-label="Savings totals" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Set aside this month"
          icon={PiggyBank}
          tone="savings"
          value={<span className="text-saved-foreground">{formatCurrency(overview.savedThisMonth)}</span>}
          changePercent={percentChange(overview.savedThisMonth, overview.savedLastMonth)}
          increaseIsGood
        />
        <StatCard
          label="Kept this month"
          icon={Wallet}
          tone="income"
          value={formatCurrency(overview.keptThisMonth)}
          hint={overview.savingsRate === null ? "No income yet this month" : `Income minus expenses · ${formatPercent(overview.savingsRate)} savings rate`}
          className={overview.keptThisMonth < 0 ? "[&>p]:text-expense-foreground" : undefined}
        />
        <StatCard
          label="Not assigned yet"
          icon={CircleDashed}
          tone="neutral"
          value={formatCurrency(unallocated)}
          hint={
            unallocated > 0
              ? "Kept but not moved into savings yet"
              : unallocated < 0
                ? "You set aside more than you kept this month"
                : "Everything you kept is assigned"
          }
        />
        <StatCard
          label="Saved all time"
          icon={Landmark}
          tone="neutral"
          value={formatCurrency(overview.savedAllTime)}
          hint={`${overview.noteCount} journal note${overview.noteCount === 1 ? "" : "s"}`}
        />
      </section>

      <SavingsGoals goals={overview.goals} destinations={destinations} dateFormat={context.settings.dateFormat} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <SavingsJournal notes={notes} pendingEntries={overview.entriesWithoutNotes} today={context.today} dateFormat={context.settings.dateFormat} />

        <div className="grid content-start gap-4">
          <CategoryBars items={overview.destinations} type="SAVINGS" title="Where your savings are" description="All time, by destination" />

          <section className="rounded-2xl border border-border bg-card p-5" aria-label="Set aside per month">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Set aside per month</span>
              <span className="text-xs text-muted-foreground">last 12 months</span>
            </div>
            <ul className="mt-4 grid h-32 grid-cols-12 items-end gap-1" aria-label="Monthly savings">
              {overview.series.map((m) => (
                <li key={m.month} className="flex h-full flex-col items-center justify-end gap-1" title={`${formatMonthLabel(m.month, { style: "short" })}: ${formatCurrency(m.saved)}`}>
                  <span
                    className={cn("w-full min-w-1 rounded-t-sm", m.month === month ? "bg-saved" : "bg-saved/35")}
                    style={{ height: `${m.saved === 0 ? 2 : Math.max(6, (m.saved / maxSaved) * 100)}%` }}
                    aria-hidden
                  />
                  <span className="sr-only">
                    {formatMonthLabel(m.month)}: {formatCurrency(m.saved)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
              <span>{formatMonthLabel(overview.series[0]!.month, { style: "short" })}</span>
              <span className="font-medium text-saved-foreground">
                {formatCompactCurrency(overview.savedThisMonth)} in {formatMonthLabel(month, { style: "short-month-only" })}
              </span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
