"use client";

import { useMemo, useRef, useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RangeSelector } from "@/components/shared/range-selector";
import { formatMonthLabel } from "@/lib/dates";
import { formatCurrency } from "@/lib/money";
import type { MonthKey, MonthTotals, RangePreset } from "@/types";
import { ChartTooltipContent } from "@/features/charts/chart-tooltip";
import { formatAxisRupees, formatMonthTick, SERIES_COLORS } from "@/features/charts/chart-utils";

export interface IncomeExpenseChartProps {
  month: MonthKey;
  initialSeries: MonthTotals[];
  initialRange?: RangePreset;
  title?: string;
  description?: string;
  className?: string;
}

/**
 * Income vs expenses bars with savings overlaid, all in rupees on one axis.
 * Mount with `key={month}` so a month change resets to the server-provided series.
 */
export function IncomeExpenseChart({
  month,
  initialSeries,
  initialRange = "6m",
  title = "Income vs expenses",
  description = "Monthly totals with savings overlaid",
  className,
}: IncomeExpenseChartProps) {
  const [range, setRange] = useState<RangePreset>(initialRange);
  const [series, setSeries] = useState<MonthTotals[]>(initialSeries);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const changeRange = (next: RangePreset) => {
    if (next === range) return;
    setRange(next);
    abortRef.current?.abort();
    if (next === initialRange) {
      setSeries(initialSeries);
      setLoading(false);
      setError(null);
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    fetch(`/api/analytics?view=series&range=${next}&month=${month}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const body = (await response.json()) as { series: MonthTotals[] };
        setSeries(body.series);
      })
      .catch((err: unknown) => {
        if ((err as { name?: string }).name !== "AbortError") setError("Could not load chart data");
      })
      .finally(() => {
        if (abortRef.current === controller) setLoading(false);
      });
  };

  const data = useMemo(
    () =>
      series.map((m) => ({
        month: m.month,
        label: formatMonthTick(m.month, series.length),
        Income: m.income,
        Expenses: m.expenses,
        Savings: m.savings,
      })),
    [series],
  );
  const hasData = series.some((m) => m.transactionCount > 0);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <CardAction>
          <RangeSelector value={range} onChange={changeRange} />
        </CardAction>
      </CardHeader>
      <CardContent>
        {error && <p className="mb-2 text-xs text-destructive">{error}</p>}
        <div className="relative h-64 w-full sm:h-72" aria-busy={loading}>
          {loading && <Skeleton className="absolute inset-0 z-10 rounded-lg opacity-60" />}
          {!hasData && !loading ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No transactions in this range yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2} barCategoryGap="28%">
                <CartesianGrid vertical={false} strokeDasharray="0" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tickFormatter={formatAxisRupees} tickLine={false} axisLine={false} width={56} tick={{ fontSize: 11 }} />
                <Tooltip
                  cursor={{ fill: "var(--muted)", opacity: 0.5 }}
                  content={(props) => (
                    <ChartTooltipContent
                      active={props.active}
                      title={formatMonthLabel((props.payload?.[0]?.payload as { month: MonthKey } | undefined)?.month ?? month)}
                      items={(props.payload ?? []).map((entry) => ({
                        name: String(entry.name),
                        value: Number(entry.value),
                        color: entry.color,
                      }))}
                    />
                  )}
                />
                <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar dataKey="Income" fill={SERIES_COLORS.income} radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="Expenses" fill={SERIES_COLORS.expense} radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Line
                  type="monotone"
                  dataKey="Savings"
                  stroke={SERIES_COLORS.savings}
                  strokeWidth={2}
                  dot={{ r: 3, strokeWidth: 2, fill: "var(--card)" }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
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
                  <th className="py-1 text-right font-medium">Savings</th>
                </tr>
              </thead>
              <tbody>
                {series.map((m) => (
                  <tr key={m.month} className="border-t border-border text-foreground">
                    <td className="py-1 pr-3">{formatMonthLabel(m.month, { style: "short" })}</td>
                    <td className="py-1 pr-3 text-right tabular-nums">{formatCurrency(m.income)}</td>
                    <td className="py-1 pr-3 text-right tabular-nums">{formatCurrency(m.expenses)}</td>
                    <td className="py-1 text-right tabular-nums">{formatCurrency(m.savings)}</td>
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
