"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addMonths, formatMonthLabel } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { MonthKey } from "@/types";

export interface MonthSelectorProps {
  month: MonthKey;
  currentMonth: MonthKey;
  className?: string;
  /** Extra query params to preserve (defaults to all current params). */
  size?: "sm" | "md";
}

/** Previous / next month navigation that writes `?month=YYYY-MM` to the URL. */
export function MonthSelector({ month, currentMonth, className, size = "md" }: MonthSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const go = (target: MonthKey) => {
    const params = new URLSearchParams(searchParams.toString());
    if (target === currentMonth) params.delete("month");
    else params.set("month", target);
    params.delete("day");
    const query = params.toString();
    startTransition(() => router.push(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  };

  const isCurrent = month === currentMonth;

  return (
    <div className={cn("inline-flex min-w-0 items-center gap-1 rounded-lg border border-border bg-card p-1", pending && "opacity-70", className)}>
      <Button variant="ghost" size={size === "sm" ? "icon-sm" : "icon"} className="shrink-0" onClick={() => go(addMonths(month, -1))} aria-label={`Previous month, ${formatMonthLabel(addMonths(month, -1))}`}>
        <ChevronLeft aria-hidden />
      </Button>
      <span
        className={cn("min-w-0 flex-1 truncate text-center font-medium tabular-nums sm:min-w-[9.5rem] sm:flex-none", size === "sm" ? "text-sm" : "text-sm sm:text-base")}
        aria-live="polite"
      >
        <span className="sm:hidden">{formatMonthLabel(month, { style: "short" })}</span>
        <span className="hidden sm:inline">{formatMonthLabel(month)}</span>
      </span>
      <Button variant="ghost" size={size === "sm" ? "icon-sm" : "icon"} className="shrink-0" onClick={() => go(addMonths(month, 1))} aria-label={`Next month, ${formatMonthLabel(addMonths(month, 1))}`}>
        <ChevronRight aria-hidden />
      </Button>
      {!isCurrent && (
        <Button variant="secondary" size="sm" onClick={() => go(currentMonth)} className="ml-1 hidden sm:inline-flex">
          Today
        </Button>
      )}
    </div>
  );
}
