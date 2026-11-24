import Link from "next/link";
import { ChartPie } from "lucide-react";
import { CategoryIcon, categoryColorValue } from "@/components/shared/category-icon";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionCard, SectionLink } from "@/components/shared/section-card";
import { formatCurrency, formatPercent } from "@/lib/money";
import type { CategoryBreakdownItem, MonthKey } from "@/types";

export interface CategoryBreakdownProps {
  items: CategoryBreakdownItem[];
  month: MonthKey;
  monthLabel: string;
  /** Rows before the rest fold into "Everything else". */
  limit?: number;
  className?: string;
}

/** Where the money went: one bar per category, biggest first. Rows open the matching transactions. */
export function CategoryBreakdown({ items, month, monthLabel, limit = 6, className }: CategoryBreakdownProps) {
  const head = items.slice(0, limit);
  const tail = items.slice(limit);
  const rest = tail.reduce((sum, item) => sum + item.amount, 0);
  const top = head[0]?.amount ?? 1;

  return (
    <SectionCard
      title="Where your money went"
      label="Spending by category"
      description={items.length > 0 ? `${monthLabel} spending by category` : undefined}
      action={items.length > 0 ? <SectionLink href={`/analytics?month=${month}`}>Analytics</SectionLink> : undefined}
      className={className}
    >
      {items.length === 0 ? (
        <EmptyState icon={ChartPie} title="No spending yet" description={`Expenses you add in ${monthLabel} show up here by category.`} compact />
      ) : (
        <ul className="space-y-3.5">
          {head.map((item) => (
            <li key={item.categoryId}>
              <Link
                href={`/transactions?month=${month}&category=${item.categoryId}&type=EXPENSE`}
                className="-mx-2 block rounded-xl px-2 py-1 transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                <div className="flex items-center gap-3">
                  <CategoryIcon icon={item.icon} color={item.color} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{formatPercent(item.percentage, 0)}</span>
                  <span className="w-24 shrink-0 text-right text-sm font-semibold tabular-nums">{formatCurrency(item.amount)}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full" style={{ width: `${Math.max(3, (item.amount / top) * 100)}%`, background: categoryColorValue(item.color) }} />
                </div>
              </Link>
            </li>
          ))}
          {tail.length > 0 && (
            <li className="flex items-center justify-between px-0 pt-1 text-sm text-muted-foreground">
              <span>
                Everything else · {tail.length} categor{tail.length === 1 ? "y" : "ies"}
              </span>
              <span className="font-semibold tabular-nums text-foreground">{formatCurrency(rest)}</span>
            </li>
          )}
        </ul>
      )}
    </SectionCard>
  );
}
