"use client";

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { formatIsoDate } from "@/lib/dates";
import { formatCurrency, formatCurrencyParts, formatPercent } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { DailyBalancePoint } from "@/types";
import { ChartTooltipContent } from "@/features/charts/chart-tooltip";
import { formatAxisRupees } from "@/features/charts/chart-utils";

export interface BalanceHeroProps {
  /** Income minus expenses in the selected month (starts at ₹0 each month). */
  monthBalance: number;
  monthLabel: string;
  points: DailyBalancePoint[];
  /** This month's income and expenses (paise). */
  monthIncome: number;
  monthExpenses: number;
  incomeChange: number | null;
  expensesChange: number | null;
  className?: string;
}

/** Arrow shows the direction of the change; colour shows whether that direction is good. */
function Badge({ value, label, good, down }: { value: string; label?: string; good: boolean | null; down: boolean }) {
  const Icon = down ? ArrowDownRight : ArrowUpRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold",
        good === true && "bg-income/15 text-income-foreground",
        good === false && "bg-expense/15 text-expense-foreground",
        good === null && "bg-muted text-muted-foreground",
      )}
    >
      {good !== null && <Icon className="size-3" aria-hidden />}
      {value}
      {label && <span className="font-normal opacity-80">{label}</span>}
    </span>
  );
}

/** Month balance hero: this month's income minus expenses, delta badges and a running line from ₹0. */
export function BalanceHero({ monthBalance, monthLabel, points, monthIncome, monthExpenses, incomeChange, expensesChange, className }: BalanceHeroProps) {
  const parts = formatCurrencyParts(monthBalance);
  const data = useMemo(
    () => points.map((p) => ({ date: p.date, label: formatIsoDate(p.date, "d MMM"), Balance: p.balance })),
    [points],
  );
  const hasData = points.some((p) => p.income > 0 || p.expenses > 0);
  const last = data[data.length - 1];

  return (
    <section className={cn("min-w-0 rounded-2xl border border-border bg-card p-5 sm:p-6", className)} aria-label="Balance this month">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Balance · {monthLabel}</h2>
          <p className="text-xs text-muted-foreground">Income minus expenses this month. Every month starts from ₹0.</p>
          <p className="mt-3 flex items-baseline gap-1 font-semibold tracking-tight" data-testid="total-balance">
            <span className={cn("text-3xl [overflow-wrap:anywhere] sm:text-4xl", monthBalance < 0 && "text-expense-foreground")}>
              {parts.sign}
              {parts.symbol}
              {parts.integer}
            </span>
            <span className="text-lg text-muted-foreground">.{parts.fraction}</span>
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge value={formatPercent(incomeChange === null ? null : Math.abs(incomeChange))} label="income vs last month" good={incomeChange === null ? null : incomeChange >= 0} down={(incomeChange ?? 0) < 0} />
            <Badge value={formatPercent(expensesChange === null ? null : Math.abs(expensesChange))} label="expenses vs last month" good={expensesChange === null ? null : expensesChange <= 0} down={(expensesChange ?? 0) < 0} />
          </div>
        </div>
        <div className="grid min-w-0 gap-1 rounded-xl border border-border bg-card-elevated px-3 py-2 text-right">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">This month</p>
          <p className="flex items-baseline justify-end gap-2 text-sm">
            <span className="text-[11px] text-muted-foreground">In</span>
            <span className="font-semibold text-income-foreground tabular-nums" data-testid="month-in">{formatCurrency(monthIncome)}</span>
          </p>
          <p className="flex items-baseline justify-end gap-2 text-sm">
            <span className="text-[11px] text-muted-foreground">Out</span>
            <span className="font-semibold text-expense-foreground tabular-nums" data-testid="month-out">{formatCurrency(monthExpenses)}</span>
          </p>
        </div>
      </div>

      <div className="relative mt-5 h-56 w-full sm:h-64">
        {!hasData ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
            Add transactions in {monthLabel} to see your balance move.
          </div>
        ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--savings)" stopOpacity={0.18} />
                <stop offset="100%" stopColor="var(--savings)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} interval="preserveStartEnd" minTickGap={28} />
            <YAxis tickFormatter={formatAxisRupees} tickLine={false} axisLine={false} width={58} tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
            <Tooltip
              cursor={{ stroke: "var(--chart-axis)", strokeOpacity: 0.35 }}
              content={(props) => (
                <ChartTooltipContent
                  active={props.active}
                  title={props.label ? String(props.label) : undefined}
                  items={(props.payload ?? []).map((entry) => ({ name: "Balance", value: Number(entry.value), color: "var(--savings)" }))}
                />
              )}
            />
            <Area type="monotone" dataKey="Balance" stroke="var(--savings)" strokeWidth={2} fill="url(#balanceFill)" dot={false} activeDot={{ r: 5, stroke: "var(--brand)", strokeWidth: 2, fill: "var(--card)" }} isAnimationActive={false} />
            {last && <ReferenceDot x={last.label} y={last.Balance} r={5} fill="var(--brand)" stroke="var(--card)" strokeWidth={2} />}
          </AreaChart>
        </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
