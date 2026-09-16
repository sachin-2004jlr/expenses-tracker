import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMonthLabel } from "@/lib/dates";
import { formatCurrency, formatPercent } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { MetricComparison, MonthlyComparison } from "@/types";

function ChangeBadge({ comparison, increaseIsGood }: { comparison: MetricComparison; increaseIsGood: boolean }) {
  const pct = comparison.changePercent;
  if (pct === null) return <span className="inline-block whitespace-nowrap rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">no data</span>;
  const direction = pct > 0 ? "up" : pct < 0 ? "down" : "flat";
  const good = direction === "flat" ? null : direction === "up" ? increaseIsGood : !increaseIsGood;
  const Icon = direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums",
        good === true && "bg-income/12 text-income-foreground",
        good === false && "bg-expense/12 text-expense-foreground",
        good === null && "bg-muted text-muted-foreground",
      )}
    >
      <Icon className="size-3" aria-hidden />
      {formatPercent(Math.abs(pct))}
    </span>
  );
}

export function MonthlyComparisonCard({ comparison, className }: { comparison: MonthlyComparison; className?: string }) {
  const rows: { label: string; data: MetricComparison; increaseIsGood: boolean }[] = [
    { label: "Income", data: comparison.income, increaseIsGood: true },
    { label: "Expenses", data: comparison.expenses, increaseIsGood: false },
    { label: "Savings", data: comparison.savings, increaseIsGood: true },
  ];
  const topChanges = comparison.categories.filter((c) => c.delta !== 0).slice(0, 3);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Month over month</CardTitle>
        <CardDescription>
          {formatMonthLabel(comparison.currentMonth, { style: "short" })} vs {formatMonthLabel(comparison.previousMonth, { style: "short" })}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <ul className="divide-y divide-border sm:hidden" aria-label="Month over month">
          {rows.map((row) => (
            <li key={row.label} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium">{row.label}</p>
                <p className="whitespace-nowrap text-xs text-muted-foreground tabular-nums">
                  <span className="text-foreground">{formatCurrency(row.data.current)}</span> vs {formatCurrency(row.data.previous)}
                </p>
              </div>
              <ChangeBadge comparison={row.data} increaseIsGood={row.increaseIsGood} />
            </li>
          ))}
        </ul>
        <div className="-mx-1 hidden overflow-x-auto px-1 sm:block">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="pb-2 pr-2 text-left font-medium">Metric</th>
                <th scope="col" className="whitespace-nowrap pb-2 pl-3 text-right font-medium">{formatMonthLabel(comparison.currentMonth, { style: "short-month-only" })}</th>
                <th scope="col" className="whitespace-nowrap pb-2 pl-3 text-right font-medium">{formatMonthLabel(comparison.previousMonth, { style: "short-month-only" })}</th>
                <th scope="col" className="whitespace-nowrap pb-2 pl-3 text-right font-medium">Change</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-t border-border">
                  <th scope="row" className="py-2 pr-2 text-left font-medium">{row.label}</th>
                  <td className="whitespace-nowrap py-2 pl-3 text-right tabular-nums">{formatCurrency(row.data.current)}</td>
                  <td className="whitespace-nowrap py-2 pl-3 text-right tabular-nums text-muted-foreground">{formatCurrency(row.data.previous)}</td>
                  <td className="whitespace-nowrap py-2 pl-3 text-right">
                    <ChangeBadge comparison={row.data} increaseIsGood={row.increaseIsGood} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {topChanges.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Biggest category moves</p>
            <ul className="space-y-1.5 text-sm">
              {topChanges.map((c) => (
                <li key={c.categoryId} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate">{c.name}</span>
                  <span className="flex shrink-0 items-center gap-2 tabular-nums">
                    <span className={cn("whitespace-nowrap text-xs", c.delta > 0 ? "text-expense-foreground" : "text-income-foreground")}>
                      {c.delta > 0 ? "+" : "−"}
                      {formatCurrency(Math.abs(c.delta))}
                    </span>
                    <ChangeBadge comparison={{ current: c.current, previous: c.previous, delta: c.delta, changePercent: c.changePercent }} increaseIsGood={false} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
