"use client";

import { useMemo } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { formatMonthLabel } from "@/lib/dates";
import { formatCompactCurrency, formatCurrency } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { MonthKey, MonthTotals } from "@/types";

export interface MonthlyBarsProps {
  series: MonthTotals[];
  currentMonth: MonthKey;
  className?: string;
}

/** Grey monthly expense bars with the selected month highlighted in orange, values underneath. */
export function MonthlyBars({ series, currentMonth, className }: MonthlyBarsProps) {
  const data = useMemo(
    () => series.map((m) => ({ month: m.month, label: formatMonthLabel(m.month, { style: "short-month-only" }), Expenses: m.expenses })),
    [series],
  );
  const hasData = series.some((m) => m.expenses > 0);

  return (
    <section className={cn("flex flex-col rounded-2xl border border-border bg-card p-5", className)} aria-label="Monthly expenses">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Monthly spending</span>
        <span className="text-xs text-muted-foreground">last {series.length} months</span>
      </div>
      <div className="mt-3 h-36 w-full">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }} barCategoryGap="30%">
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                content={(props) =>
                  props.active && props.payload?.[0] ? (
                    <div className="rounded-md border border-border bg-popover px-2 py-1 text-xs">
                      {formatMonthLabel((props.payload[0].payload as { month: string }).month, { style: "short" })} · {formatCurrency(Number(props.payload[0].value))}
                    </div>
                  ) : null
                }
              />
              <Bar dataKey="Expenses" radius={[6, 6, 2, 2]} maxBarSize={34} isAnimationActive={false}>
                {data.map((entry) => (
                  <Cell key={entry.month} fill={entry.month === currentMonth ? "var(--brand)" : "var(--chart-bar-muted)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No spending recorded yet.</div>
        )}
      </div>
      <ul className="mt-2 grid text-center text-[11px] tabular-nums" style={{ gridTemplateColumns: `repeat(${Math.max(1, data.length)}, minmax(0, 1fr))` }}>
        {data.map((entry) => (
          <li key={entry.month} className={cn(entry.month === currentMonth ? "font-semibold text-brand" : "text-muted-foreground")}>
            {formatCompactCurrency(entry.Expenses)}
          </li>
        ))}
      </ul>
    </section>
  );
}
