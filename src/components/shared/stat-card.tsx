import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { ReactNode } from "react";
import { formatPercent } from "@/lib/money";
import { cn } from "@/lib/utils";

export type StatTone = "neutral" | "income" | "expense" | "saved" | "brand";

export interface StatCardProps {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  tone?: StatTone;
  /** Percentage change vs the previous period; null renders "no data last month". */
  changePercent?: number | null;
  /** Whether an increase is good (income) or bad (expenses). */
  increaseIsGood?: boolean;
  changeLabel?: string;
  hint?: ReactNode;
  className?: string;
}

const TONE_ICON: Record<StatTone, string> = {
  neutral: "bg-muted text-foreground",
  income: "bg-income/12 text-income-foreground",
  expense: "bg-expense/12 text-expense-foreground",
  saved: "bg-saved/12 text-saved-foreground",
  brand: "bg-brand/12 text-brand",
};

/** Change pill: the arrow shows the direction, the colour shows whether that direction is good. */
export function ChangePill({ changePercent, increaseIsGood = true, className }: { changePercent: number | null; increaseIsGood?: boolean; className?: string }) {
  const direction = changePercent === null ? "none" : changePercent > 0 ? "up" : changePercent < 0 ? "down" : "flat";
  const good = direction === "up" ? increaseIsGood : direction === "down" ? !increaseIsGood : null;
  const Icon = direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums",
        good === true && "bg-income/12 text-income-foreground",
        good === false && "bg-expense/12 text-expense-foreground",
        good === null && "bg-muted text-muted-foreground",
        className,
      )}
    >
      <Icon className="size-3" aria-hidden />
      {changePercent === null ? "—" : formatPercent(Math.abs(changePercent))}
    </span>
  );
}

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

  return (
    <div className={cn("flex min-w-0 flex-col gap-2 rounded-2xl bg-card shadow-card p-4 text-card-foreground sm:p-5", className)}>
      <div className="flex items-center gap-2">
        <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg", TONE_ICON[tone])}>
          <Icon className="size-3.5" aria-hidden />
        </span>
        <p className="min-w-0 truncate text-sm font-normal text-muted-foreground">{label}</p>
      </div>
      <p className="min-w-0 text-2xl font-semibold tracking-tight tabular-nums [overflow-wrap:anywhere]">{value}</p>
      {(hasChange || hint) && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {hasChange && <ChangePill changePercent={changePercent ?? null} increaseIsGood={increaseIsGood} />}
          {hasChange && <span>{changePercent === null ? "no data last month" : changeLabel}</span>}
          {hint && <span className={cn(hasChange && "basis-full")}>{hint}</span>}
        </div>
      )}
    </div>
  );
}
