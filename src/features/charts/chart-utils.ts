import { formatMonthLabel } from "@/lib/dates";
import { formatCompactCurrency, formatCurrency } from "@/lib/money";
import type { MonthKey } from "@/types";

/**
 * Shared chart helpers. Series colours come from CSS variables so they follow the theme and
 * the validated palette in globals.css. Text in charts always uses text tokens.
 */

export const SERIES_COLORS = {
  income: "var(--income)",
  expense: "var(--expense)",
  savings: "var(--savings)",
} as const;

export const CATEGORICAL_COLORS = Array.from({ length: 8 }, (_, i) => `var(--chart-${i + 1})`);

/** Axis tick: compact rupees (₹55K, ₹1.2L). */
export function formatAxisRupees(paise: number): string {
  return formatCompactCurrency(paise);
}

/** Tooltip value: full rupees. */
export function formatTooltipRupees(paise: number): string {
  return formatCurrency(paise);
}

export function formatMonthTick(month: MonthKey, count: number): string {
  return formatMonthLabel(month, { style: count > 8 ? "short-month-only" : "short" });
}

/** Rounded 'nice' upper bound so the y-axis does not end on an awkward number. */
export function niceMax(values: number[]): number {
  const max = Math.max(0, ...values);
  if (max === 0) return 100_000; // ₹1,000 baseline so empty charts still have a scale
  const magnitude = 10 ** Math.floor(Math.log10(max));
  const normalised = max / magnitude;
  const factor = normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 5 ? 5 : 10;
  return factor * magnitude;
}
