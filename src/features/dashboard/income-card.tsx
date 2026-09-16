"use client";

import { useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";
import { ArrowUpRight, TrendingUp } from "lucide-react";
import { formatMonthLabel } from "@/lib/dates";
import { formatCurrency, formatCurrencyParts, formatPercent } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { MonthTotals } from "@/types";

export interface IncomeCardProps {
  amount: number;
  changePercent: number | null;
  series: MonthTotals[];
  className?: string;
}

/** Bright green "asset" card: this month's income with an income trend behind it. */
export function IncomeCard({ amount, changePercent, series, className }: IncomeCardProps) {
  const parts = formatCurrencyParts(amount);
  const data = useMemo(() => series.map((m) => ({ month: m.month, label: formatMonthLabel(m.month, { style: "short-month-only" }), Income: m.income })), [series]);
  const first = series[0];
  const last = series[series.length - 1];

  return (
    <section
      className={cn("relative flex flex-col overflow-hidden rounded-2xl bg-income-surface p-5 text-black", className)}
      aria-label="Income this month"
      style={{ backgroundImage: "radial-gradient(120% 80% at 100% 0%, rgba(255,255,255,0.28), transparent 60%)" }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-black/85 text-income-surface">
            <TrendingUp className="size-4" aria-hidden />
          </span>
          <span className="text-sm font-semibold">Income</span>
        </div>
        <span className="rounded-md bg-black/10 px-2 py-1 text-xs font-semibold">this month</span>
      </div>
      <p className="mt-4 flex items-baseline gap-1 font-bold tracking-tight" data-testid="income-amount">
        <span className="text-3xl">
          {parts.symbol}
          {parts.integer}
        </span>
        <span className="text-base opacity-70">.{parts.fraction}</span>
      </p>
      <p className="mt-1 flex items-center gap-1 text-sm font-semibold">
        {changePercent === null ? (
          <span className="opacity-70">no income last month</span>
        ) : (
          <>
            {changePercent >= 0 ? "+" : "−"}
            {formatPercent(Math.abs(changePercent))}
            <ArrowUpRight className={cn("size-4", changePercent < 0 && "rotate-90")} aria-hidden />
            <span className="font-normal opacity-70">vs last month</span>
          </>
        )}
      </p>

      <div className="mt-3 h-24 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#053b1c" stopOpacity={0.55} />
                <stop offset="100%" stopColor="#053b1c" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <Tooltip
              cursor={false}
              content={(props) =>
                props.active && props.payload?.[0] ? (
                  <div className="rounded-md bg-black/85 px-2 py-1 text-xs text-white">
                    {formatMonthLabel((props.payload[0].payload as { month: string }).month, { style: "short" })} · {formatCurrency(Number(props.payload[0].value))}
                  </div>
                ) : null
              }
            />
            <Area type="monotone" dataKey="Income" stroke="#053b1c" strokeWidth={2} fill="url(#incomeFill)" dot={false} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 flex justify-between text-[11px] font-medium opacity-70">
        <span>{first ? formatMonthLabel(first.month, { style: "short" }) : ""}</span>
        <span>{last ? formatMonthLabel(last.month, { style: "short" }) : ""}</span>
      </div>
    </section>
  );
}
