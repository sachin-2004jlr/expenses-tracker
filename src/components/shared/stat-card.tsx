import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { ReactNode } from "react";
import { formatPercent } from "@/lib/money";
import { cn } from "@/lib/utils";

export type StatTone = "neutral" | "income" | "expense" | "savings";

export interface StatCardProps {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  tone?: StatTone;
  /** Percentage change vs the previous period; null renders "no data last month". */
  changePercent?: number | null;
  /** Whether an increase is good (savings/income) or bad (expenses). */
  increaseIsGood?: boolean;
  changeLabel?: string;
  hint?: ReactNode;
  className?: string;
}

const TONE_ICON: Record<StatTone, string> = {
  neutral: "bg-muted text-foreground",
  income: "bg-income/12 text-income-foreground",
  expense: "bg-expense/12 text-expense-foreground",
  savings: "bg-savings/12 text-savings-foreground",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  changePercent,
  increaseIsGood = true,
  changeLabel = "vs last month",
  hint,
  className,
}: StatCardProps) {
  const hasChange = changePercent !== undefined;
  const direction = changePercent === null || changePercent === undefined ? "none" : changePercent > 0 ? "up" : changePercent < 0 ? "down" : "flat";
  const good = direction === "up" ? increaseIsGood : direction === "down" ? !increaseIsGood : null;
  const DeltaIcon = direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;

  return (
    <div className={cn("flex flex-col gap-3 rounded-xl bg-card p-4 text-card-foreground ring-1 ring-foreground/10 sm:p-5", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <span className={cn("flex size-8 items-center justify-center rounded-lg", TONE_ICON[tone])}>
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <p className="text-2xl font-semibold tracking-tight tabular-nums sm:text-[1.7rem]">{value}</p>
      {(hasChange || hint) && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {hasChange && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium",
                direction === "none" && "bg-muted text-muted-foreground",
                good === true && "bg-income/12 text-income-foreground",
                good === false && "bg-expense/12 text-expense-foreground",
                direction === "flat" && "bg-muted text-muted-foreground",
              )}
            >
              <DeltaIcon className="size-3" aria-hidden />
              {changePercent === null || changePercent === undefined ? "—" : formatPercent(Math.abs(changePercent))}
            </span>
          )}
          {hasChange && <span>{changePercent === null ? "no data last month" : changeLabel}</span>}
          {hint && <span className="basis-full sm:basis-auto">{hint}</span>}
        </div>
      )}
    </div>
  );
}
