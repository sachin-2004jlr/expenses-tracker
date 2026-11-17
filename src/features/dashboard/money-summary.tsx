"use client";

import { ArrowDownLeft, ArrowUpRight, CalendarClock, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChangePill } from "@/components/shared/stat-card";
import { useTransactionDialog } from "@/features/transactions/transaction-dialog-provider";
import { formatCurrency, formatCurrencyParts } from "@/lib/money";
import { cn } from "@/lib/utils";

export interface MoneySummaryProps {
  /** Money left: carried in + this month's income − this month's expenses (paise). */
  balance: number;
  /** Left over from earlier months. */
  carriedIn: number;
  previousMonthLabel: string;
  monthLabel: string;
  income: number;
  expenses: number;
  incomeChange: number | null;
  expensesChange: number | null;
  /** Average spend per day so far. */
  perDay: number;
  /** Days left in the month including today; null for past/future months. */
  daysLeft: number | null;
  className?: string;
}

/**
 * The first thing on the dashboard: how much money is left, how that number was worked out (in
 * words), and this month's income and spending. Savings are a separate ledger and never appear here.
 */
export function MoneySummary({
  balance,
  carriedIn,
  previousMonthLabel,
  monthLabel,
  income,
  expenses,
  incomeChange,
  expensesChange,
  perDay,
  daysLeft,
  className,
}: MoneySummaryProps) {
  const { openCreate } = useTransactionDialog();
  const parts = formatCurrencyParts(balance);
  const available = carriedIn + income;
  const spentShare = available > 0 ? Math.min(100, (expenses / available) * 100) : expenses > 0 ? 100 : 0;
  const perDayLeft = daysLeft && balance > 0 ? Math.floor(balance / daysLeft / 100) * 100 : null;
  const perDayRounded = Math.round(perDay / 100) * 100;

  return (
    <section
      aria-label="Money left"
      className={cn(
        "relative min-w-0 overflow-hidden rounded-3xl border border-border bg-card p-5 sm:p-7",
        "bg-[radial-gradient(120%_120%_at_100%_0%,color-mix(in_oklch,var(--brand)_14%,transparent),transparent_55%)]",
        className,
      )}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-center lg:gap-10">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">Money left · {monthLabel}</p>
          <p className="mt-2 flex items-baseline gap-1 font-bold tracking-tight" data-testid="total-balance">
            <span className={cn("text-4xl [overflow-wrap:anywhere] sm:text-5xl", balance < 0 && "text-expense-foreground")}>
              {parts.sign}
              {parts.symbol}
              {parts.integer}
            </span>
            <span className="text-lg text-muted-foreground sm:text-xl">.{parts.fraction}</span>
          </p>

          {/* The sum, spelled out, so the number is never a mystery. */}
          <p className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground tabular-nums" data-testid="balance-breakdown">
            <span>
              <span className="font-semibold text-foreground">{formatCurrency(carriedIn)}</span> carried from {previousMonthLabel}
            </span>
            <Plus className="size-3.5 shrink-0" aria-label="plus" />
            <span>
              <span className="font-semibold text-income-foreground">{formatCurrency(income)}</span> income
            </span>
            <Minus className="size-3.5 shrink-0" aria-label="minus" />
            <span>
              <span className="font-semibold text-expense-foreground">{formatCurrency(expenses)}</span> spent
            </span>
          </p>

          <div className="mt-5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{available > 0 ? `Spent ${Math.round(spentShare)}% of the money you had` : "No money in yet this month"}</span>
              {perDayLeft !== null && <span className="hidden sm:inline">≈ {formatCurrency(perDayLeft)} a day for {daysLeft} days</span>}
            </div>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-label="Share of available money spent"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(spentShare)}
            >
              <div
                className={cn("h-full rounded-full transition-[width] duration-500", spentShare >= 90 ? "bg-expense" : spentShare >= 70 ? "bg-brand" : "bg-income")}
                style={{ width: `${spentShare}%` }}
              />
            </div>
            {perDayLeft !== null && <p className="mt-2 text-xs text-muted-foreground sm:hidden">≈ {formatCurrency(perDayLeft)} a day for {daysLeft} days</p>}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:flex">
            <Button variant="outline" onClick={() => openCreate({ type: "INCOME" })} className="rounded-full">
              <ArrowDownLeft data-icon="inline-start" className="text-income-foreground" aria-hidden />
              Add income
            </Button>
            <Button onClick={() => openCreate({ type: "EXPENSE" })} className="rounded-full">
              <ArrowUpRight data-icon="inline-start" aria-hidden />
              Add expense
            </Button>
          </div>
        </div>

        <ul className="grid min-w-0 grid-cols-3 gap-2 lg:grid-cols-1" aria-label="This month">
          <li className="flex min-w-0 flex-col items-start gap-2 rounded-2xl border border-border bg-background/40 p-3 lg:flex-row lg:items-center lg:gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl lg:size-9 bg-income/12 text-income-foreground">
              <ArrowDownLeft className="size-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">Income</p>
              <p className="truncate text-base font-bold tabular-nums sm:text-lg" data-testid="income-amount">{formatCurrency(income)}</p>
            </div>
            <ChangePill changePercent={incomeChange} increaseIsGood className="hidden lg:inline-flex" />
          </li>
          <li className="flex min-w-0 flex-col items-start gap-2 rounded-2xl border border-border bg-background/40 p-3 lg:flex-row lg:items-center lg:gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl lg:size-9 bg-expense/12 text-expense-foreground">
              <ArrowUpRight className="size-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">Spent</p>
              <p className="truncate text-base font-bold tabular-nums sm:text-lg" data-testid="expense-amount">{formatCurrency(expenses)}</p>
            </div>
            <ChangePill changePercent={expensesChange} increaseIsGood={false} className="hidden lg:inline-flex" />
          </li>
          <li className="flex min-w-0 flex-col items-start gap-2 rounded-2xl border border-border bg-background/40 p-3 lg:flex-row lg:items-center lg:gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl lg:size-9 bg-muted text-foreground">
              <CalendarClock className="size-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-muted-foreground">
                <span className="sm:hidden">Per day</span>
                <span className="hidden sm:inline">Average spend</span>
              </p>
              <p className="truncate text-base font-bold tabular-nums sm:text-lg">
                {formatCurrency(perDayRounded)}
                <span className="hidden text-xs font-medium text-muted-foreground sm:inline"> / day</span>
              </p>
            </div>
          </li>
        </ul>
      </div>
    </section>
  );
}
