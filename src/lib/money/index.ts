/**
 * Money utilities.
 *
 * All amounts inside the application are integer **paise** (1 rupee = 100 paise).
 * Arithmetic is done on integers only; floating point is used solely for display and
 * for percentages that are explicitly rounded.
 */

export type Paise = number;

export const PAISE_PER_RUPEE = 100;

/** Largest amount we accept: 1 trillion rupees in paise, comfortably inside Number.MAX_SAFE_INTEGER. */
export const MAX_PAISE = 100_000_000_000_000;

const MONEY_PATTERN = /^\d{1,15}(\.\d{1,2})?$/;

export function isValidPaise(value: unknown): value is Paise {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= MAX_PAISE;
}

/**
 * Parse user input like "55,000", "₹850.5", "1 24 500" into integer paise.
 * Returns `null` for anything that is not a non-negative amount with at most two decimals.
 */
export function parseMoney(input: string | number | null | undefined): Paise | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") {
    if (!Number.isFinite(input) || input < 0) return null;
    return rupeesToPaise(input.toFixed(2));
  }
  const cleaned = input
    .replace(/[₹,\s]/g, "")
    .replace(/^rs\.?/i, "")
    .replace(/^inr/i, "")
    .trim();
  if (cleaned === "") return null;
  if (!MONEY_PATTERN.test(cleaned)) return null;
  return rupeesToPaise(cleaned);
}

/**
 * Convert a decimal rupee string ("55000", "850.5", "0.05") to paise without floating point.
 * Any decimal digit beyond the second is rounded half-up.
 */
export function rupeesToPaise(rupees: string | number): Paise {
  const text = typeof rupees === "number" ? rupees.toFixed(2) : rupees.trim();
  const negative = text.startsWith("-");
  const unsigned = negative ? text.slice(1) : text;
  const [wholePart, fractionPart = ""] = unsigned.split(".");
  const whole = wholePart === "" ? 0 : Number.parseInt(wholePart, 10);
  if (!Number.isFinite(whole)) throw new RangeError(`Invalid rupee amount: ${rupees}`);
  const fraction2 = (fractionPart + "00").slice(0, 2);
  let paise = whole * PAISE_PER_RUPEE + Number.parseInt(fraction2, 10);
  if (fractionPart.length > 2 && Number.parseInt(fractionPart[2] ?? "0", 10) >= 5) {
    paise += 1;
  }
  const result = negative ? -paise : paise;
  if (Math.abs(result) > MAX_PAISE) throw new RangeError(`Amount out of range: ${rupees}`);
  return result;
}

/** Convert paise to a rupee number. Only for display or for handing facts to the AI layer. */
export function paiseToRupees(paise: Paise): number {
  return paise / PAISE_PER_RUPEE;
}

/** Decimal string with exactly two decimals, e.g. 5500000 -> "55000.00". Safe for CSV/JSON export. */
export function paiseToDecimalString(paise: Paise): string {
  const negative = paise < 0;
  const abs = Math.abs(paise);
  const whole = Math.floor(abs / PAISE_PER_RUPEE);
  const fraction = abs % PAISE_PER_RUPEE;
  return `${negative ? "-" : ""}${whole}.${fraction.toString().padStart(2, "0")}`;
}

export interface FormatCurrencyOptions {
  locale?: string;
  currency?: string;
  /** Always show two decimals (default: only when the amount has paise). */
  alwaysShowDecimals?: boolean;
  /** Show a leading + for positive amounts. */
  signDisplay?: "auto" | "always" | "never" | "exceptZero";
  /** Compact notation for charts / tight spaces: 1.2L, 55K. */
  compact?: boolean;
}

const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(key: string, factory: () => Intl.NumberFormat): Intl.NumberFormat {
  let formatter = formatterCache.get(key);
  if (!formatter) {
    formatter = factory();
    formatterCache.set(key, formatter);
  }
  return formatter;
}

/**
 * Format paise as currency using the Indian numbering system by default:
 * 12450000 -> "₹1,24,500", 85050 -> "₹850.50".
 */
export function formatCurrency(paise: Paise, options: FormatCurrencyOptions = {}): string {
  const {
    locale = "en-IN",
    currency = "INR",
    alwaysShowDecimals = false,
    signDisplay = "auto",
    compact = false,
  } = options;

  if (!Number.isFinite(paise)) return "—";

  const rupees = paiseToRupees(paise);

  if (compact) {
    return formatCompactCurrency(paise, { locale, currency, signDisplay });
  }

  const hasFraction = Math.abs(paise) % PAISE_PER_RUPEE !== 0;
  const fractionDigits = alwaysShowDecimals || hasFraction ? 2 : 0;
  const key = `${locale}|${currency}|${fractionDigits}|${signDisplay}`;
  const formatter = getFormatter(
    key,
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
        signDisplay,
      }),
  );
  return formatter.format(rupees);
}

/** Compact Indian-style formatting used for chart axes: ₹55K, ₹1.2L, ₹2.5Cr. */
export function formatCompactCurrency(
  paise: Paise,
  options: { locale?: string; currency?: string; signDisplay?: FormatCurrencyOptions["signDisplay"] } = {},
): string {
  const { currency = "INR", signDisplay = "auto" } = options;
  const symbol = currency === "INR" ? "₹" : `${currency} `;
  const negative = paise < 0;
  const abs = Math.abs(paiseToRupees(paise));
  let text: string;
  if (abs >= 1_00_00_000) text = `${trimNumber(abs / 1_00_00_000)}Cr`;
  else if (abs >= 1_00_000) text = `${trimNumber(abs / 1_00_000)}L`;
  else if (abs >= 1_000) text = `${trimNumber(abs / 1_000)}K`;
  else text = trimNumber(abs);
  const sign = negative ? "-" : signDisplay === "always" || (signDisplay === "exceptZero" && paise > 0) ? "+" : "";
  return `${sign}${symbol}${text}`;
}

function trimNumber(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1);
}

/** Format with an explicit + / − prefix based on transaction type: "+ ₹55,000", "− ₹850". */
export function formatSignedAmount(
  paise: Paise,
  type: "INCOME" | "EXPENSE",
  options: FormatCurrencyOptions = {},
): string {
  const sign = type === "INCOME" ? "+" : "−";
  return `${sign} ${formatCurrency(Math.abs(paise), options)}`;
}

/** Format a percentage with one decimal: 69.94 -> "69.9%". */
export function formatPercent(value: number | null | undefined, fractionDigits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${value.toFixed(fractionDigits)}%`;
}

/** Sum a list of paise amounts with integer arithmetic. */
export function sumPaise(values: Iterable<Paise>): Paise {
  let total = 0;
  for (const value of values) total += value;
  return total;
}
