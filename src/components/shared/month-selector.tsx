"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { NavPending } from "@/components/layout/nav-pending";
import { Button } from "@/components/ui/button";
import { addMonths, formatMonthLabel } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { MonthKey } from "@/types";

export interface MonthSelectorProps {
  month: MonthKey;
  currentMonth: MonthKey;
  className?: string;
  size?: "sm" | "md";
}

/**
 * Previous / next month navigation via `?month=YYYY-MM`. The arrows are prefetched links, so the
 * neighbouring months are already loaded in the background and switching is instant.
 */
export function MonthSelector({ month, currentMonth, className, size = "md" }: MonthSelectorProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const hrefFor = (target: MonthKey) => {
    const params = new URLSearchParams(searchParams.toString());
    if (target === currentMonth) params.delete("month");
    else params.set("month", target);
    params.delete("day");
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const previous = addMonths(month, -1);
  const next = addMonths(month, 1);
  const iconSize = size === "sm" ? "icon-sm" : "icon";

  return (
    <div className={cn("inline-flex min-w-0 items-center gap-1 rounded-lg border border-border bg-card p-1", className)}>
      <Button
        variant="ghost"
        size={iconSize}
        className="relative shrink-0"
        nativeButton={false}
        render={<Link href={hrefFor(previous)} prefetch scroll={false} />}
        aria-label={`Previous month, ${formatMonthLabel(previous)}`}
      >
        <ChevronLeft aria-hidden />
        <NavPending className="inset-0 rounded-md ring-2 ring-brand/50" />
      </Button>
      <span
        className={cn("min-w-0 flex-1 truncate text-center font-medium tabular-nums sm:min-w-[9.5rem] sm:flex-none", size === "sm" ? "text-sm" : "text-sm sm:text-base")}
        aria-live="polite"
      >
        <span className="sm:hidden">{formatMonthLabel(month, { style: "short" })}</span>
        <span className="hidden sm:inline">{formatMonthLabel(month)}</span>
      </span>
      <Button
        variant="ghost"
        size={iconSize}
        className="relative shrink-0"
        nativeButton={false}
        render={<Link href={hrefFor(next)} prefetch scroll={false} />}
        aria-label={`Next month, ${formatMonthLabel(next)}`}
      >
        <ChevronRight aria-hidden />
        <NavPending className="inset-0 rounded-md ring-2 ring-brand/50" />
      </Button>
      {month !== currentMonth && (
        <Button variant="secondary" size="sm" nativeButton={false} render={<Link href={hrefFor(currentMonth)} prefetch scroll={false} />} className="ml-1 hidden sm:inline-flex">
          Today
        </Button>
      )}
    </div>
  );
}
