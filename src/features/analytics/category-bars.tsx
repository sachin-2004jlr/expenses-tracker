import Link from "next/link";
import { ChartColumn } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryIcon, categoryColorValue } from "@/components/shared/category-icon";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency, formatPercent } from "@/lib/money";
import type { CategoryBreakdownItem, TransactionType } from "@/types";

export interface CategoryBarsProps {
  items: CategoryBreakdownItem[];
  type: TransactionType;
  title: string;
  description?: string;
  linkQuery?: string;
  limit?: number;
  className?: string;
}

/** Horizontal bar list: one row per category, bar length = share of the total. */
export function CategoryBars({ items, type, title, description, linkQuery = "", limit = 10, className }: CategoryBarsProps) {
  const visible = items.slice(0, limit);
  const max = visible[0]?.amount ?? 0;
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {visible.length === 0 ? (
          <EmptyState icon={ChartColumn} title={type === "EXPENSE" ? "No expenses in this range" : "No income in this range"} compact />
        ) : (
          <ul className="space-y-2.5">
            {visible.map((item) => (
              <li key={item.categoryId}>
                <Link
                  href={`/transactions?category=${item.categoryId}&type=${type}${linkQuery}`}
                  className="group grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1 rounded-lg px-1 py-1 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                >
                  <CategoryIcon icon={item.icon} color={item.color} size="sm" />
                  <span className="flex min-w-0 items-baseline justify-between gap-2 text-sm">
                    <span className="truncate font-medium">{item.name}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {item.count}× · {formatPercent(item.percentage, item.percentage >= 10 ? 0 : 1)}
                    </span>
                  </span>
                  <span className="text-sm font-semibold tabular-nums">{formatCurrency(item.amount)}</span>
                  <span className="col-start-2 col-end-4 h-1.5 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${max === 0 ? 0 : Math.max(2, (item.amount / max) * 100)}%`, background: categoryColorValue(item.color) }}
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
