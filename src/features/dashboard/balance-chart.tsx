"use client";

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SectionCard } from "@/components/shared/section-card";
import { formatIsoDate } from "@/lib/dates";
import type { DailyBalancePoint } from "@/types";
import { ChartTooltipContent } from "@/features/charts/chart-tooltip";
import { formatAxisRupees } from "@/features/charts/chart-utils";

export interface BalanceChartProps {
  points: DailyBalancePoint[];
  monthLabel: string;
  className?: string;
}

/** Money left at the end of each day of the month. */
export function BalanceChart({ points, monthLabel, className }: BalanceChartProps) {
  const data = useMemo(() => points.map((p) => ({ date: p.date, label: formatIsoDate(p.date, "d MMM"), Balance: p.balance })), [points]);
  const hasData = points.some((p) => p.income > 0 || p.expenses > 0);

  return (
    <SectionCard title="Money left, day by day" description={`How your balance moved through ${monthLabel}`} className={className}>
      <div className="h-52 w-full sm:h-60">
        {!hasData ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border px-4 text-center text-sm text-muted-foreground">
            Add income or expenses in {monthLabel} to see this chart.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} interval="preserveStartEnd" minTickGap={28} />
              <YAxis tickFormatter={formatAxisRupees} tickLine={false} axisLine={false} width={52} tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
              <Tooltip
                cursor={{ stroke: "var(--chart-axis)", strokeOpacity: 0.35 }}
                content={(props) => (
                  <ChartTooltipContent
                    active={props.active}
                    title={props.label ? String(props.label) : undefined}
                    items={(props.payload ?? []).map((entry) => ({ name: "Money left", value: Number(entry.value), color: "var(--brand)" }))}
                  />
                )}
              />
              <Area
                type="monotone"
                dataKey="Balance"
                stroke="var(--brand)"
                strokeWidth={2}
                fill="url(#balanceFill)"
                dot={false}
                activeDot={{ r: 5, stroke: "var(--brand)", strokeWidth: 2, fill: "var(--card)" }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </SectionCard>
  );
}
