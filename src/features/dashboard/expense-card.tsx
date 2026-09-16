"use client";

import { useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";
import { ArrowDownRight, ArrowUpRight, Flame } from "lucide-react";
import { formatMonthLabel } from "@/lib/dates";
import { formatCurrency, formatCurrencyParts, formatPercent } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { MonthTotals } from "@/types";

export interface ExpenseCardProps {
  amount: number;
  changePercent: number | null;
  series: MonthTotals[];
  perDay: number;
  className?: string;
}

/** Dark card with a red expense trend: this month's spending and the daily burn rate. */
export function ExpenseCard({ amount, changePercent, series, perDay, className }: ExpenseCardProps) {
  const parts = formatCurrencyParts(amount);
  const data = useMemo(() => series.map((m) => ({ month: m.month, Expenses: m.expenses })), [series]);
  // For expenses an increase is bad.
  const good = changePercent === null ? null : changePercent <= 0;

  return (
    <section className={cn("relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card p-5", className)} aria-label="Expenses this month">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-expense/15 text-expense-foreground">
            <Flame className="size-4" aria-hidden />
          </span>
          <span className="text-sm font-semibold">Expenses</span>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold",
            good === true && "bg-income/15 text-income-foreground",
            good === false && "bg-expense/15 text-expense-foreground",
            good === null && "bg-muted text-muted-foreground",
          )}
        >
          {changePercent === null ? (
            "no data last month"
          ) : (
            <>
              {changePercent > 0 ? <ArrowUpRight className="size-3" aria-hidden /> : <ArrowDownRight className="size-3" aria-hidden />}
              {changePercent > 0 ? "+" : "−"}
              {formatPercent(Math.abs(changePercent))}
            </>
          )}
        </span>
      </div>
      <p className="mt-4 flex items-baseline gap-1 font-bold tracking-tight" data-testid="expense-amount">
        <span className="text-3xl">
          {parts.symbol}
          {parts.integer}
        </span>
        <span className="text-base text-muted-foreground">.{parts.fraction}</span>
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{formatCurrency(perDay)}</span> / day so far
      </p>

      <div className="mt-3 h-20 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--expense)" stopOpacity={0.45} />
                <stop offset="100%" stopColor="var(--expense)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <Tooltip
              cursor={false}
              content={(props) =>
                props.active && props.payload?.[0] ? (
                  <div className="rounded-md border border-border bg-popover px-2 py-1 text-xs">
                    {formatMonthLabel((props.payload[0].payload as { month: string }).month, { style: "short" })} · {formatCurrency(Number(props.payload[0].value))}
                  </div>
                ) : null
              }
            />
            <Area type="monotone" dataKey="Expenses" stroke="var(--expense)" strokeWidth={2} fill="url(#expenseFill)" dot={false} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
