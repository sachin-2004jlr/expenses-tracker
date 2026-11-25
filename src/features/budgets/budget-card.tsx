import Link from "next/link";
import { Target } from "lucide-react";
import { CategoryIcon } from "@/components/shared/category-icon";
import { SectionCard, SectionLink } from "@/components/shared/section-card";
import { dailyAllowance } from "@/lib/analytics/budgets";
import { formatCurrency, formatPercent } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { BudgetStatus, BudgetSummary } from "@/types";

const BAR: Record<BudgetStatus, string> = {
  ok: "bg-income",
  warning: "bg-brand",
  over: "bg-destructive",
};

const TEXT: Record<BudgetStatus, string> = {
  ok: "text-income-foreground",
  warning: "text-brand",
  over: "text-destructive",
};

function ProgressBar({ percentage, status, label }: { percentage: number; status: BudgetStatus; label: string }) {
  const width = Math.max(0, Math.min(100, percentage));
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/10"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(width)}
    >
      <div className={cn("bar-grow h-full rounded-full transition-[width] duration-500", BAR[status])} style={{ width: `${width}%` }} />
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
  if (summary.items.length === 0) {
    return (
      <SectionCard title="Budgets" label="Budgets" className={className}>
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-border p-4">
          <span className="flex size-9 items-center justify-center rounded-xl bg-brand/12 text-brand">
            <Target className="size-4" aria-hidden />
          </span>
          <p className="text-sm text-muted-foreground">Give a category a monthly limit and see how much is left, plus a daily allowance for the rest of the month.</p>
          <Link
            href="/settings?tab=budgets"
            className="inline-flex h-9 items-center justify-center rounded-full bg-brand px-4 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand/90"
            data-testid="budgets-cta"
          >
            Set budgets
          </Link>
        </div>
      </SectionCard>
    );
  }

  const allowance = daysLeft ? dailyAllowance(summary.totalRemaining, daysLeft) : 0;
  const over = summary.totalRemaining < 0;

  return (
    <SectionCard
      title="Budgets"
      label="Budgets"
      description={monthLabel}
      action={<SectionLink href="/settings?tab=budgets">Manage</SectionLink>}
      className={className}
      data-testid="budget-card"
    >
      <div className="rounded-xl bg-muted/50 p-3">
        <p className="flex flex-wrap items-baseline gap-x-1.5 font-bold tracking-tight">
          <span className="text-xl tabular-nums" data-testid="budget-spent">{formatCurrency(summary.totalSpent)}</span>
          <span className="text-sm font-medium text-muted-foreground tabular-nums">of {formatCurrency(summary.totalBudget)}</span>
        </p>
        <div className="mt-2">
          <ProgressBar percentage={summary.percentage} status={summary.status} label="Total budget used" />
        </div>
        <p className={cn("mt-2 text-xs font-medium", TEXT[summary.status])}>
          {over ? `Over by ${formatCurrency(-summary.totalRemaining)}` : `${formatCurrency(summary.totalRemaining)} left · ${formatPercent(summary.percentage)} used`}
        </p>
        {daysLeft !== null && !over && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground tabular-nums">{formatCurrency(allowance)}</span> a day for the next {daysLeft} day{daysLeft === 1 ? "" : "s"}
          </p>
        )}
      </div>

      <ul className="mt-4 space-y-3.5" aria-label="Category budgets">
        {summary.items.map((item) => (
          <li key={item.categoryId} className="min-w-0">
            <div className="flex items-center gap-2">
              <CategoryIcon icon={item.icon} color={item.color} size="sm" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {formatCurrency(item.spent)} / {formatCurrency(item.budget)}
              </span>
            </div>
            <div className="mt-1.5">
              <ProgressBar percentage={item.percentage} status={item.status} label={`${item.name} budget used`} />
            </div>
            <p className={cn("mt-1 text-[11px] tabular-nums", item.remaining < 0 ? "text-destructive" : "text-muted-foreground")}>
              {item.remaining < 0 ? `Over by ${formatCurrency(-item.remaining)}` : `${formatCurrency(item.remaining)} left`}
            </p>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
