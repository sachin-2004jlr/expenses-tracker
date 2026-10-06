"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ChartPie } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryIcon, categoryColorValue } from "@/components/shared/category-icon";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency, formatPercent } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { CategoryBreakdownItem, MonthKey, TransactionType } from "@/types";
import { ChartTooltipContent } from "@/features/charts/chart-tooltip";

export interface CategoryDonutProps {
  items: CategoryBreakdownItem[];
  month: MonthKey;
  type?: TransactionType;
  title?: string;
  description?: string;
  className?: string;
  /** Max slices before folding the rest into "Other". */
  maxSlices?: number;
  /** Base path for click-through (defaults to the transactions page). */
  linkBase?: string;
}

interface Slice {
  key: string;
  name: string;
  icon: string;
  color: string;
  amount: number;
  count: number;
  percentage: number;
  categoryIds: string[];
}

export function CategoryDonut({
  items,
  month,
  type = "EXPENSE",
  title = "Spending by category",
  description = "Where the money went this month",
  className,
  maxSlices = 7,
  linkBase = "/transactions",
}: CategoryDonutProps) {
  const [active, setActive] = useState<string | null>(null);

  const slices = useMemo<Slice[]>(() => {
    const head = items.slice(0, maxSlices);
    const tail = items.slice(maxSlices);
    const result: Slice[] = head.map((item) => ({
      key: item.categoryId,
      name: item.name,
      icon: item.icon,
      color: categoryColorValue(item.color),
      amount: item.amount,
      count: item.count,
      percentage: item.percentage,
      categoryIds: [item.categoryId],
    }));
    if (tail.length > 0) {
      result.push({
        key: "__other",
        name: `Other (${tail.length})`,
        icon: "tag",
        color: "var(--color-slate-400)",
        amount: tail.reduce((s, i) => s + i.amount, 0),
        count: tail.reduce((s, i) => s + i.count, 0),
        percentage: Math.round(tail.reduce((s, i) => s + i.percentage, 0) * 10) / 10,
        categoryIds: tail.map((i) => i.categoryId),
      });
    }
    return result;
  }, [items, maxSlices]);

  const total = items.reduce((sum, item) => sum + item.amount, 0);
  const activeSlice = slices.find((s) => s.key === active) ?? null;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="@container">
        {slices.length === 0 ? (
          <EmptyState icon={ChartPie} title={type === "EXPENSE" ? "No expenses this month" : "No income this month"} compact />
        ) : (
          <div className="grid gap-4 @md:grid-cols-[11rem_minmax(0,1fr)] @md:items-center">
            <div className="relative mx-auto h-44 w-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={slices}
                    dataKey="amount"
                    nameKey="name"
                    innerRadius={56}
                    outerRadius={82}
                    paddingAngle={2}
                    strokeWidth={0}
                    isAnimationActive={false}
                    onMouseEnter={(_, index) => setActive(slices[index]?.key ?? null)}
                    onMouseLeave={() => setActive(null)}
                  >
                    {slices.map((slice) => (
                      <Cell
                        key={slice.key}
                        fill={slice.color}
                        opacity={active && active !== slice.key ? 0.35 : 1}
                        style={{ transition: "opacity 120ms" }}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={(props) => {
                      const entry = props.payload?.[0];
                      const slice = entry?.payload as Slice | undefined;
                      return (
                        <ChartTooltipContent
                          active={props.active}
                          title={slice?.name}
                          items={slice ? [{ name: `${slice.count} txn${slice.count === 1 ? "" : "s"} · ${formatPercent(slice.percentage)}`, value: slice.amount, color: slice.color }] : []}
                        />
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{activeSlice ? activeSlice.name : "Total"}</span>
                <span className="text-lg font-semibold tabular-nums">{formatCurrency(activeSlice ? activeSlice.amount : total, { compact: total >= 10_000_000 })}</span>
              </div>
            </div>
            <ul className="space-y-1" aria-label="Category totals">
              {slices.map((slice) => {
                const href =
                  slice.categoryIds.length === 1
                    ? `${linkBase}?month=${month}&category=${slice.categoryIds[0]}&type=${type}`
                    : `${linkBase}?month=${month}&type=${type}`;
                return (
                  <li key={slice.key}>
                    <Link
                      href={href}
                      onMouseEnter={() => setActive(slice.key)}
                      onMouseLeave={() => setActive(null)}
                      onFocus={() => setActive(slice.key)}
                      onBlur={() => setActive(null)}
                      className={cn(
                        "grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-x-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 sm:gap-x-3",
                        active === slice.key && "bg-muted",
                      )}
                    >
                      <span className="size-2.5 rounded-sm" style={{ background: slice.color }} aria-hidden />
                      <CategoryIcon icon={slice.icon} color={items.find((i) => i.categoryId === slice.key)?.color ?? "slate"} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate">{slice.name}</span>
                        <span className="block text-[11px] leading-tight text-muted-foreground tabular-nums">
                          {slice.count}× · {formatPercent(slice.percentage, slice.percentage >= 10 ? 0 : 1)}
                        </span>
                      </span>
                      <span className="whitespace-nowrap text-right font-medium tabular-nums">{formatCurrency(slice.amount, { compact: slice.amount >= 1_000_000_000 })}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
