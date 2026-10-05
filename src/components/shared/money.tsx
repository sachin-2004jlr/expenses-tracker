import { formatCurrency, formatSignedAmount, type FormatCurrencyOptions } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { TransactionType } from "@/types";

export interface AmountProps extends Omit<FormatCurrencyOptions, "signDisplay"> {
  paise: number;
  /** Colour + sign the amount by transaction type. */
  type?: TransactionType;
  /** Colour by sign (positive = income colour, negative = expense colour). */
  colorBySign?: boolean;
  /** Prefix with + / − when a type is given (default true). */
  signed?: boolean;
  className?: string;
}

/** Formatted INR amount with consistent colour semantics. Numbers use tabular figures. */
export function Amount({ paise, type, colorBySign = false, signed = true, className, ...format }: AmountProps) {
  const text = type && signed ? formatSignedAmount(paise, type, format) : formatCurrency(paise, format);
  const color = type
    ? type === "INCOME"
      ? "text-income-foreground"
      : type === "EXPENSE"
        ? "text-expense-foreground"
        : "text-saved-foreground"
    : colorBySign
      ? paise > 0
        ? "text-income-foreground"
        : paise < 0
          ? "text-expense-foreground"
          : "text-foreground"
      : "";
  return (
    <span className={cn("tabular-nums", color, className)} aria-label={text.replace("−", "minus ").replace("+ ", "plus ")}>
      {text}
    </span>
  );
}
