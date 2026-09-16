import { formatCurrency, formatPercent } from "@/lib/money";
import { cn } from "@/lib/utils";

export interface SavingsGaugeProps {
  /** Savings rate 0-100 (may be negative or above 100); null when there is no income. */
  rate: number | null;
  savings: number;
  className?: string;
}

const DOTS = 21;

function dotColor(index: number): string {
  // red -> orange -> green across the arc
  const t = index / (DOTS - 1);
  if (t < 0.35) return "var(--expense)";
  if (t < 0.65) return "var(--brand)";
  return "var(--income)";
}

/** "Fear & greed" style dotted half-gauge for the monthly savings rate. */
export function SavingsGauge({ rate, savings, className }: SavingsGaugeProps) {
  const clamped = rate === null ? null : Math.max(0, Math.min(100, rate));
  const active = clamped === null ? -1 : Math.round((clamped / 100) * (DOTS - 1));
  const label = rate === null ? "No income yet" : rate < 10 ? "Low" : rate < 30 ? "Getting there" : rate < 50 ? "Healthy" : "Excellent";
  const cx = 100;
  const cy = 96;
  const r = 78;

  return (
    <section className={cn("flex flex-col rounded-2xl border border-border bg-card p-5", className)} aria-label="Savings rate">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Savings rate</span>
        <span className="text-xs text-muted-foreground">this month</span>
      </div>
      <div className="relative mx-auto mt-2 w-full max-w-[220px]">
        <svg viewBox="0 0 200 110" className="w-full" role="img" aria-label={`Savings rate ${rate === null ? "unavailable" : formatPercent(rate)}`}>
          {Array.from({ length: DOTS }, (_, i) => {
            const angle = Math.PI - (i / (DOTS - 1)) * Math.PI;
            const x = cx + r * Math.cos(angle);
            const y = cy - r * Math.sin(angle);
            const isActive = i === active;
            const isPast = active >= 0 && i < active;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={isActive ? 6 : 3.4}
                fill={isActive || isPast ? dotColor(i) : "var(--chart-bar-muted)"}
                stroke={isActive ? "var(--card)" : "none"}
                strokeWidth={isActive ? 2 : 0}
                opacity={isPast ? 0.55 : 1}
              />
            );
          })}
        </svg>
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
          <span className="text-2xl font-bold tabular-nums" data-testid="savings-rate">{rate === null ? "—" : formatPercent(rate)}</span>
          <span className="text-[11px] text-muted-foreground">{label}</span>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <span>Low</span>
        <span className={cn("normal-case tracking-normal", savings < 0 ? "text-expense-foreground" : "text-foreground")}>{formatCurrency(savings)} saved</span>
        <span>High</span>
      </div>
    </section>
  );
}
