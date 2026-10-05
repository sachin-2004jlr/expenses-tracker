"use client";

import { useMemo } from "react";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMonthLabel } from "@/lib/dates";
import { formatCurrency } from "@/lib/money";
import type { MonthKey, MonthTotals } from "@/types";
import { ChartTooltipContent } from "@/features/charts/chart-tooltip";
import { formatAxisRupees, formatMonthTick, SERIES_COLORS } from "@/features/charts/chart-utils";

export interface TrendChartProps {
  series: MonthTotals[];
  title?: string;
  description?: string;
  className?: string;
}

/** Income, expense and savings trend lines on a single rupee axis. */
export function TrendChart({ series, title = "Monthly trend", description = "Income, expenses and savings over time", className }: TrendChartProps) {
  const data = useMemo(
    () =>
      series.map((m) => ({
        month: m.month,
        label: formatMonthTick(m.month, series.length),
        Income: m.income,
        Expenses: m.expenses,
        Savings: m.savings,
        "Set aside": m.saved,
      })),
    [series],
  );
  const hasData = series.some((m) => m.transactionCount > 0);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full sm:h-72">
          {!hasData ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No transactions in this range yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tickFormatter={formatAxisRupees} tickLine={false} axisLine={false} width={56} tick={{ fontSize: 11 }} />
                <ReferenceLine y={0} stroke="var(--chart-axis)" strokeOpacity={0.4} />
                <Tooltip
                  cursor={{ stroke: "var(--chart-axis)", strokeOpacity: 0.3 }}
                  content={(props) => (
                    <ChartTooltipContent
                      active={props.active}
                      title={formatMonthLabel((props.payload?.[0]?.payload as { month: MonthKey } | undefined)?.month ?? series[0]?.month ?? "2026-01")}
                      items={(props.payload ?? []).map((entry) => ({ name: String(entry.name), value: Number(entry.value), color: entry.color }))}
                    />
                  )}
                />
                <Legend iconType="plainline" iconSize={12} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Line type="monotone" dataKey="Income" stroke={SERIES_COLORS.income} strokeWidth={2} dot={{ r: 3, strokeWidth: 2, fill: "var(--card)" }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="Expenses" stroke={SERIES_COLORS.expense} strokeWidth={2} dot={{ r: 3, strokeWidth: 2, fill: "var(--card)" }} activeDot={{ r: 5 }} />
                {series.some((m) => m.saved > 0) && (
                  <Line type="monotone" dataKey="Set aside" stroke="var(--saved)" strokeWidth={2} strokeDasharray="4 3" dot={{ r: 3, strokeWidth: 2, fill: "var(--card)" }} activeDot={{ r: 5 }} />
                )}
                <Line type="monotone" dataKey="Savings" stroke={SERIES_COLORS.savings} strokeWidth={2} strokeDasharray="0" dot={{ r: 3, strokeWidth: 2, fill: "var(--card)" }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        <details className="mt-3 text-xs text-muted-foreground">
          <summary className="cursor-pointer select-none hover:text-foreground">View as table</summary>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-1 pr-3 font-medium">Month</th>
                  <th className="py-1 pr-3 text-right font-medium">Income</th>
                  <th className="py-1 pr-3 text-right font-medium">Expenses</th>
                  <th className="py-1 pr-3 text-right font-medium">Savings</th>
                  <th className="py-1 pr-3 text-right font-medium">Set aside</th>
                  <th className="py-1 text-right font-medium">Rate</th>
                </tr>
              </thead>
              <tbody>
                {series.map((m) => (
                  <tr key={m.month} className="border-t border-border text-foreground">
                    <td className="py-1 pr-3">{formatMonthLabel(m.month, { style: "short" })}</td>
                    <td className="py-1 pr-3 text-right tabular-nums">{formatCurrency(m.income)}</td>
                    <td className="py-1 pr-3 text-right tabular-nums">{formatCurrency(m.expenses)}</td>
                    <td className="py-1 pr-3 text-right tabular-nums">{formatCurrency(m.savings)}</td>
                    <td className="py-1 pr-3 text-right tabular-nums">{formatCurrency(m.saved)}</td>
                    <td className="py-1 text-right tabular-nums">{m.savingsRate === null ? "—" : `${m.savingsRate.toFixed(1)}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
