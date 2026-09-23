import Link from "next/link";
import { ArrowUpRight, Target } from "lucide-react";
import { CategoryIcon } from "@/components/shared/category-icon";
import { dailyAllowance } from "@/lib/analytics/budgets";
import { formatCurrency, formatPercent } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { BudgetStatus, BudgetSummary } from "@/types";

const BAR: Record<BudgetStatus, string> = {
  ok: "bg-income",
  warning: "bg-brand",
  over: "bg-expense",
};

const TEXT: Record<BudgetStatus, string> = {
  ok: "text-income-foreground",
  warning: "text-brand",
  over: "text-expense-foreground",
};

function ProgressBar({ percentage, status, label }: { percentage: number; status: BudgetStatus; label: string }) {
  const width = Math.max(0, Math.min(100, percentage));
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(width)}
    >
      <div className={cn("h-full rounded-full transition-[width] duration-500", BAR[status])} style={{ width: `${width}%` }} />
    </div>
  );
}

export interface BudgetCardProps {
  summary: BudgetSummary;
  monthLabel: string;
  /** Days left in the month including today; null for past or future months. */
  daysLeft: number | null;
  className?: string;
}

/** Monthly budgets: overall usage, a daily allowance, and one bar per category. */
export function BudgetCard({ summary, monthLabel, daysLeft, className }: BudgetCardProps) {
  const manage = (
    <Link href="/settings?tab=budgets" className="inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground">
      Manage <ArrowUpRight className="size-3" aria-hidden />
    </Link>
  );

  if (summary.items.length === 0) {
    return (
      <section className={cn("flex min-w-0 flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center", className)} aria-label="Budgets">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand">
          <Target className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Set monthly budgets</p>
          <p className="text-sm text-muted-foreground">Give categories a limit and see how much is left, with a daily allowance for the rest of the month.</p>
        </div>
        <Link
          href="/settings?tab=budgets"
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-full bg-brand px-4 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand/90"
          data-testid="budgets-cta"
        >
          Set budgets
        </Link>
      </section>
    );
  }

  const allowance = daysLeft ? dailyAllowance(summary.totalRemaining, daysLeft) : 0;
  const over = summary.totalRemaining < 0;

  return (
    <section className={cn("flex min-w-0 flex-col rounded-2xl border border-border bg-card p-5", className)} aria-label="Budgets" data-testid="budget-card">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold">Budgets · {monthLabel}</span>
        {manage}
      </div>

      <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:gap-8">
        <div className="min-w-0">
          <p className="flex flex-wrap items-baseline gap-x-1.5 font-bold tracking-tight">
            <span className="text-2xl tabular-nums" data-testid="budget-spent">{formatCurrency(summary.totalSpent)}</span>
            <span className="text-sm font-medium text-muted-foreground tabular-nums">of {formatCurrency(summary.totalBudget)}</span>
          </p>
          <div className="mt-2">
            <ProgressBar percentage={summary.percentage} status={summary.status} label="Total budget used" />
          </div>
          <p className={cn("mt-2 text-xs font-medium", TEXT[summary.status])}>
            {over
              ? `Over by ${formatCurrency(-summary.totalRemaining)}`
              : `${formatCurrency(summary.totalRemaining)} left · ${formatPercent(summary.percentage)} used`}
          </p>
          {daysLeft !== null && !over && (
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground tabular-nums">{formatCurrency(allowance)}</span> a day for the next {daysLeft} day{daysLeft === 1 ? "" : "s"}
            </p>
          )}
          {summary.overCount > 0 && (
            <p className="mt-1 text-xs text-expense-foreground">
              {summary.overCount} categor{summary.overCount === 1 ? "y is" : "ies are"} over budget
            </p>
          )}
        </div>

        <ul className="grid min-w-0 gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Category budgets">
          {summary.items.map((item) => (
            <li key={item.categoryId} className="min-w-0">
              <div className="flex items-center gap-2">
                <CategoryIcon icon={item.icon} color={item.color} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.name}</span>
                <span className={cn("shrink-0 text-xs font-semibold tabular-nums", TEXT[item.status])}>{formatPercent(item.percentage, 0)}</span>
              </div>
              <div className="mt-1.5">
                <ProgressBar percentage={item.percentage} status={item.status} label={`${item.name} budget used`} />
              </div>
              <p className="mt-1 truncate text-[11px] text-muted-foreground tabular-nums">
                {formatCurrency(item.spent)} of {formatCurrency(item.budget)}
                {item.remaining < 0 ? ` · over by ${formatCurrency(-item.remaining)}` : ` · ${formatCurrency(item.remaining)} left`}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
