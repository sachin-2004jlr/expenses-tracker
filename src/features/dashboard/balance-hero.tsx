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
  totalBalance: number;
  openingBalance: number;
  monthLabel: string;
  points: DailyBalancePoint[];
  savings: number;
  savingsRate: number | null;
  incomeChange: number | null;
  className?: string;
}

function Badge({ value, label, good }: { value: string; label?: string; good: boolean | null }) {
  const Icon = good === false ? ArrowDownRight : ArrowUpRight;
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

/** "Evaluation" style hero: big balance, delta badges and a white running-balance line. */
export function BalanceHero({ totalBalance, openingBalance, monthLabel, points, savings, savingsRate, incomeChange, className }: BalanceHeroProps) {
  const parts = formatCurrencyParts(totalBalance);
  const monthDelta = points.length ? points[points.length - 1]!.balance - openingBalance : 0;
  const data = useMemo(
    () => points.map((p) => ({ date: p.date, label: formatIsoDate(p.date, "d MMM"), Balance: p.balance })),
    [points],
  );
  const hasData = points.some((p) => p.income > 0 || p.expenses > 0);
  const last = data[data.length - 1];

  return (
    <section className={cn("rounded-2xl border border-border bg-card p-5 sm:p-6", className)} aria-label="Total balance">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Total balance</h2>
          <p className="text-xs text-muted-foreground">All-time income minus expenses</p>
          <p className="mt-3 flex items-baseline gap-1 font-semibold tracking-tight" data-testid="total-balance">
            <span className={cn("text-3xl sm:text-4xl", totalBalance < 0 && "text-expense-foreground")}>
              {parts.sign}
              {parts.symbol}
              {parts.integer}
            </span>
            <span className="text-lg text-muted-foreground">.{parts.fraction}</span>
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge value={formatPercent(incomeChange === null ? null : Math.abs(incomeChange))} label="income vs last month" good={incomeChange === null ? null : incomeChange >= 0} />
            <Badge value={`${monthDelta >= 0 ? "+" : "−"}${formatCurrency(Math.abs(monthDelta))}`} label={`in ${monthLabel}`} good={monthDelta === 0 ? null : monthDelta > 0} />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card-elevated px-3 py-2 text-right">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Saved this month</p>
          <p className={cn("text-lg font-semibold tabular-nums", savings < 0 ? "text-expense-foreground" : "text-income-foreground")}>{formatCurrency(savings)}</p>
          <p className="text-[11px] text-muted-foreground">{savingsRate === null ? "no income yet" : `${formatPercent(savingsRate)} savings rate`}</p>
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
