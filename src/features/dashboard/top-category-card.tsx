import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CategoryIcon } from "@/components/shared/category-icon";
import { formatCurrency, formatPercent } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { CategoryBreakdownItem, MonthKey } from "@/types";

export interface TopCategoryCardProps {
  item: CategoryBreakdownItem | null;
  month: MonthKey;
  className?: string;
}

/** "My wallet" style card: the biggest spending category with its share as an orange slider. */
export function TopCategoryCard({ item, month, className }: TopCategoryCardProps) {
  const share = item ? Math.max(0, Math.min(100, item.percentage)) : 0;
  return (
    <section className={cn("flex flex-col rounded-2xl border border-border bg-card p-5", className)} aria-label="Top spending category">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Top category</span>
        {item && (
          <Link href={`/transactions?month=${month}&category=${item.categoryId}&type=EXPENSE`} className="text-xs text-muted-foreground hover:text-foreground">
            View <ArrowUpRight className="inline size-3" aria-hidden />
          </Link>
        )}
      </div>
      {item ? (
        <>
          <div className="mt-3 flex items-center gap-3">
            <CategoryIcon icon={item.icon} color={item.color} size="lg" />
            <div className="min-w-0">
              <p className="truncate font-semibold">{item.name}</p>
              <p className="text-xs text-muted-foreground">
                {item.count} transaction{item.count === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold tabular-nums" data-testid="top-category-amount">{formatCurrency(item.amount)}</p>
          <div className="mt-3">
            <div className="relative h-1.5 w-full rounded-full bg-muted">
              <div className="absolute inset-y-0 left-0 rounded-full bg-brand" style={{ width: `${share}%` }} />
              <span
                className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[4px] bg-brand shadow-glow-brand"
                style={{ left: `${share}%` }}
                aria-hidden
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{formatPercent(item.percentage)}</span> of this month&apos;s spending
            </p>
          </div>
        </>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">No expenses recorded this month.</p>
      )}
    </section>
  );
}
