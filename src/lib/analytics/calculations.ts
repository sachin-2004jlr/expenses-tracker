import { addDays, addMonths, compareIsoDates, monthKeyOf, monthRange, previousMonthKey } from "@/lib/dates";
import type {
  Category,
  CategoryBreakdownItem,
  CategoryChange,
  CategoryType,
  DailyBalancePoint,
  IsoDate,
  MetricComparison,
  MonthKey,
  MonthTotals,
  MonthlyComparison,
  TransactionLike,
  TransactionType,
} from "@/types";

/**
 * Pure financial calculations.
 *
 * These functions are the application's **source of truth** for every number shown in the UI
 * (dashboard, calendar, analytics). They operate on integer paise, never on floats, and
 * are covered by unit tests in `calculations.test.ts`.
 */

export function roundTo(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function calculateIncome(transactions: Iterable<TransactionLike>): number {
  let total = 0;
  for (const tx of transactions) if (tx.type === "INCOME") total += tx.amount;
  return total;
}

export function calculateExpenses(transactions: Iterable<TransactionLike>): number {
  let total = 0;
  for (const tx of transactions) if (tx.type === "EXPENSE") total += tx.amount;
  return total;
}

/** All-time balance: total income minus total expenses. Can be negative. */
export function calculateBalance(transactions: Iterable<TransactionLike>): number {
  let balance = 0;
  for (const tx of transactions) balance += tx.type === "INCOME" ? tx.amount : -tx.amount;
  return balance;
}

export function filterByDateRange<T extends TransactionLike>(
  transactions: Iterable<T>,
  from: IsoDate | null | undefined,
  to: IsoDate | null | undefined,
): T[] {
  const result: T[] = [];
  for (const tx of transactions) {
    if (from && compareIsoDates(tx.date, from) < 0) continue;
    if (to && compareIsoDates(tx.date, to) > 0) continue;
    result.push(tx);
  }
  return result;
}

export function filterByMonth<T extends TransactionLike>(transactions: Iterable<T>, month: MonthKey): T[] {
  const { start, end } = monthRange(month);
  return filterByDateRange(transactions, start, end);
}

export function calculateMonthlyIncome(transactions: Iterable<TransactionLike>, month: MonthKey): number {
  return calculateIncome(filterByMonth(transactions, month));
}

export function calculateMonthlyExpenses(transactions: Iterable<TransactionLike>, month: MonthKey): number {
  return calculateExpenses(filterByMonth(transactions, month));
}

/** Savings = income − expenses (may be negative when overspending). */
export function calculateSavings(income: number, expenses: number): number {
  return income - expenses;
}

/**
 * Savings rate as a percentage with one decimal (69.9). Returns `null` when income is zero,
 * because a rate is undefined without income; callers render it as "—".
 */
export function calculateSavingsRate(income: number, expenses: number): number | null {
  if (income <= 0) return null;
  return roundTo((calculateSavings(income, expenses) / income) * 100, 1);
}

export function calculateMonthTotals(transactions: Iterable<TransactionLike>, month: MonthKey): MonthTotals {
  const monthly = filterByMonth(transactions, month);
  const income = calculateIncome(monthly);
  const expenses = calculateExpenses(monthly);
  return {
    month,
    income,
    expenses,
    savings: calculateSavings(income, expenses),
    savingsRate: calculateSavingsRate(income, expenses),
    transactionCount: monthly.length,
  };
}

/** Percentage change from `previous` to `current`, one decimal. `null` when previous is 0. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return roundTo(((current - previous) / Math.abs(previous)) * 100, 1);
}

export function compareMetrics(current: number, previous: number): MetricComparison {
  return { current, previous, delta: current - previous, changePercent: percentChange(current, previous) };
}

export interface CategoryInfo extends Pick<Category, "id" | "name" | "icon" | "color"> {
  type?: CategoryType;
}

/**
 * Totals per category for a transaction type, sorted by amount descending.
 * Unknown categories are still reported (as "Uncategorised") so totals always reconcile.
 */
export function categoryBreakdown(
  transactions: Iterable<TransactionLike>,
  type: TransactionType,
  categories: ReadonlyMap<string, CategoryInfo> | CategoryInfo[],
): CategoryBreakdownItem[] {
  const lookup = Array.isArray(categories) ? new Map(categories.map((c) => [c.id, c])) : categories;
  const buckets = new Map<string, { amount: number; count: number }>();
  let total = 0;
  for (const tx of transactions) {
    if (tx.type !== type) continue;
    const key = tx.categoryId ?? "uncategorised";
    const bucket = buckets.get(key) ?? { amount: 0, count: 0 };
    bucket.amount += tx.amount;
    bucket.count += 1;
    buckets.set(key, bucket);
    total += tx.amount;
  }
  const items: CategoryBreakdownItem[] = [];
  for (const [categoryId, bucket] of buckets) {
    const category = lookup.get(categoryId);
    items.push({
      categoryId,
      name: category?.name ?? "Uncategorised",
      icon: category?.icon ?? "tag",
      color: category?.color ?? "slate",
      amount: bucket.amount,
      count: bucket.count,
      percentage: total === 0 ? 0 : roundTo((bucket.amount / total) * 100, 1),
    });
  }
  items.sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name));
  return items;
}

/** Compare a month with the month before it, including per-category expense changes. */
export function monthlyComparison(
  transactions: Iterable<TransactionLike>,
  currentMonth: MonthKey,
  categories: ReadonlyMap<string, CategoryInfo> | CategoryInfo[],
  previousMonth: MonthKey = previousMonthKey(currentMonth),
): MonthlyComparison {
  const list = Array.from(transactions);
  const current = calculateMonthTotals(list, currentMonth);
  const previous = calculateMonthTotals(list, previousMonth);

  const currentCategories = categoryBreakdown(filterByMonth(list, currentMonth), "EXPENSE", categories);
  const previousCategories = categoryBreakdown(filterByMonth(list, previousMonth), "EXPENSE", categories);
  const previousById = new Map(previousCategories.map((c) => [c.categoryId, c]));
  const seen = new Set<string>();
  const categoryChanges: CategoryChange[] = [];

  for (const item of currentCategories) {
    seen.add(item.categoryId);
    const prev = previousById.get(item.categoryId);
    categoryChanges.push({
      categoryId: item.categoryId,
      name: item.name,
      current: item.amount,
      previous: prev?.amount ?? 0,
      delta: item.amount - (prev?.amount ?? 0),
      changePercent: percentChange(item.amount, prev?.amount ?? 0),
    });
  }
  for (const item of previousCategories) {
    if (seen.has(item.categoryId)) continue;
    categoryChanges.push({
      categoryId: item.categoryId,
      name: item.name,
      current: 0,
      previous: item.amount,
      delta: -item.amount,
      changePercent: percentChange(0, item.amount),
    });
  }
  categoryChanges.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  return {
    currentMonth,
    previousMonth,
    income: compareMetrics(current.income, previous.income),
    expenses: compareMetrics(current.expenses, previous.expenses),
    savings: compareMetrics(current.savings, previous.savings),
    categories: categoryChanges,
  };
}

/** The `limit` largest expenses, ties broken by most recent date. */
export function largestExpenses<T extends TransactionLike>(transactions: Iterable<T>, limit = 5): T[] {
  return Array.from(transactions)
    .filter((tx) => tx.type === "EXPENSE")
    .sort((a, b) => b.amount - a.amount || compareIsoDates(b.date, a.date))
    .slice(0, Math.max(0, limit));
}

/** Month-by-month totals for the given month keys (missing months are zero-filled). */
export function monthlySeries(transactions: Iterable<TransactionLike>, months: MonthKey[]): MonthTotals[] {
  const buckets = new Map<MonthKey, { income: number; expenses: number; count: number }>();
  for (const month of months) buckets.set(month, { income: 0, expenses: 0, count: 0 });
  for (const tx of transactions) {
    const bucket = buckets.get(monthKeyOf(tx.date));
    if (!bucket) continue;
    if (tx.type === "INCOME") bucket.income += tx.amount;
    else bucket.expenses += tx.amount;
    bucket.count += 1;
  }
  return months.map((month) => {
    const bucket = buckets.get(month)!;
    return {
      month,
      income: bucket.income,
      expenses: bucket.expenses,
      savings: calculateSavings(bucket.income, bucket.expenses),
      savingsRate: calculateSavingsRate(bucket.income, bucket.expenses),
      transactionCount: bucket.count,
    };
  });
}

/** Integer averages over a series (0 when the series is empty). */
export function averageMonthly(series: MonthTotals[]): { income: number; expenses: number; savings: number } {
  if (series.length === 0) return { income: 0, expenses: 0, savings: 0 };
  const income = Math.round(series.reduce((sum, m) => sum + m.income, 0) / series.length);
  const expenses = Math.round(series.reduce((sum, m) => sum + m.expenses, 0) / series.length);
  return { income, expenses, savings: income - expenses };
}

/**
 * Day-by-day running balance through a month, starting from `openingBalance` (the all-time
 * balance the day before the month starts). Days after `untilDate` are omitted, so the current
 * month stops at today instead of drawing a flat line into the future.
 */
export function dailyBalanceSeries(
  transactions: Iterable<TransactionLike>,
  month: MonthKey,
  openingBalance: number,
  untilDate?: IsoDate | null,
): DailyBalancePoint[] {
  const { start, end } = monthRange(month);
  const last = untilDate && compareIsoDates(untilDate, end) < 0 ? untilDate : end;
  if (compareIsoDates(last, start) < 0) return [];
  const perDay = new Map<IsoDate, { income: number; expenses: number }>();
  for (const tx of transactions) {
    if (compareIsoDates(tx.date, start) < 0 || compareIsoDates(tx.date, end) > 0) continue;
    const bucket = perDay.get(tx.date) ?? { income: 0, expenses: 0 };
    if (tx.type === "INCOME") bucket.income += tx.amount;
    else bucket.expenses += tx.amount;
    perDay.set(tx.date, bucket);
  }
  const points: DailyBalancePoint[] = [];
  let balance = openingBalance;
  let date = start;
  let guard = 0;
  while (compareIsoDates(date, last) <= 0 && guard < 62) {
    const bucket = perDay.get(date) ?? { income: 0, expenses: 0 };
    balance += bucket.income - bucket.expenses;
    points.push({ date, balance, income: bucket.income, expenses: bucket.expenses });
    date = addDays(date, 1);
    guard += 1;
  }
  return points;
}

/** Month keys covered by a range preset ending at `endMonth`. `null` for "all". */
export function monthsForRange(endMonth: MonthKey, range: "3m" | "6m" | "12m" | "all"): MonthKey[] | null {
  const count = range === "3m" ? 3 : range === "6m" ? 6 : range === "12m" ? 12 : null;
  if (count === null) return null;
  const keys: MonthKey[] = [];
  for (let i = count - 1; i >= 0; i -= 1) keys.push(addMonths(endMonth, -i));
  return keys;
}
