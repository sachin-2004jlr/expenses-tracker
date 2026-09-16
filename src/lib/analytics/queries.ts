import { getDb } from "@/lib/db";
import { listMonthKeys, monthKeyOf, monthRange, monthsBetween, previousMonthKey } from "@/lib/dates";
import { listCategories } from "@/lib/services/categories";
import { listTransactions, listTransactionsInRange } from "@/lib/services/transactions";
import { transactionFiltersSchema } from "@/lib/validation/transaction";
import type {
  AnalyticsOverview,
  CategoryBreakdownItem,
  DashboardSummary,
  IsoDate,
  MonthKey,
  MonthTotals,
  RangePreset,
  TransactionType,
} from "@/types";
import {
  averageMonthly,
  calculateMonthTotals,
  calculateSavings,
  calculateSavingsRate,
  categoryBreakdown,
  dailyBalanceSeries,
  largestExpenses,
  monthlyComparison,
  monthsForRange,
  roundTo,
} from "./calculations";

/**
 * Database-backed analytics. Heavy aggregations (all-time totals, monthly series, category
 * totals over long ranges) run as MongoDB aggregation pipelines; month-level numbers reuse the
 * pure calculation module so every figure on screen comes from the same tested code path.
 */

const INCOME_SUM = { $sum: { $cond: [{ $eq: ["$type", "INCOME"] }, "$amount", 0] } };
const EXPENSE_SUM = { $sum: { $cond: [{ $eq: ["$type", "EXPENSE"] }, "$amount", 0] } };

export interface AllTimeTotals {
  income: number;
  expenses: number;
  balance: number;
  transactionCount: number;
  firstMonth: MonthKey | null;
  lastMonth: MonthKey | null;
}

export async function getAllTimeTotals(userId: string): Promise<AllTimeTotals> {
  const db = await getDb();
  const [row] = await db.transactions
    .aggregate<{ income: number; expenses: number; total: number; first: string | null; last: string | null }>([
      { $match: { userId } },
      { $group: { _id: null, income: INCOME_SUM, expenses: EXPENSE_SUM, total: { $sum: 1 }, first: { $min: "$date" }, last: { $max: "$date" } } },
    ])
    .toArray();
  const income = row?.income ?? 0;
  const expenses = row?.expenses ?? 0;
  return {
    income,
    expenses,
    balance: income - expenses,
    transactionCount: row?.total ?? 0,
    firstMonth: row?.first ? row.first.slice(0, 7) : null,
    lastMonth: row?.last ? row.last.slice(0, 7) : null,
  };
}

/** All-time balance from transactions dated strictly before `date`. */
export async function getBalanceBefore(userId: string, date: IsoDate): Promise<number> {
  const db = await getDb();
  const [row] = await db.transactions
    .aggregate<{ income: number; expenses: number }>([
      { $match: { userId, date: { $lt: date } } },
      { $group: { _id: null, income: INCOME_SUM, expenses: EXPENSE_SUM } },
    ])
    .toArray();
  return (row?.income ?? 0) - (row?.expenses ?? 0);
}

/** Month-by-month totals from one aggregation, zero-filled for the requested months. */
export async function getMonthlySeries(userId: string, months: MonthKey[]): Promise<MonthTotals[]> {
  if (months.length === 0) return [];
  const db = await getDb();
  const first = months[0]!;
  const last = months[months.length - 1]!;
  const rows = await db.transactions
    .aggregate<{ _id: string; income: number; expenses: number; total: number }>([
      { $match: { userId, date: { $gte: monthRange(first).start, $lte: monthRange(last).end } } },
      { $group: { _id: { $substrBytes: ["$date", 0, 7] }, income: INCOME_SUM, expenses: EXPENSE_SUM, total: { $sum: 1 } } },
    ])
    .toArray();

  const byMonth = new Map(rows.map((row) => [row._id, row]));
  return months.map((month) => {
    const row = byMonth.get(month);
    const income = row?.income ?? 0;
    const expenses = row?.expenses ?? 0;
    return {
      month,
      income,
      expenses,
      savings: calculateSavings(income, expenses),
      savingsRate: calculateSavingsRate(income, expenses),
      transactionCount: row?.total ?? 0,
    };
  });
}

/** Category totals over a date range from one aggregation. */
export async function getCategoryTotals(userId: string, type: TransactionType, from: string, to: string): Promise<CategoryBreakdownItem[]> {
  const db = await getDb();
  const [rows, categories] = await Promise.all([
    db.transactions
      .aggregate<{ _id: string; amount: number; total: number }>([
        { $match: { userId, type, date: { $gte: from, $lte: to } } },
        { $group: { _id: "$categoryId", amount: { $sum: "$amount" }, total: { $sum: 1 } } },
      ])
      .toArray(),
    listCategories(userId),
  ]);
  const lookup = new Map(categories.map((c) => [c.id, c]));
  const grand = rows.reduce((sum, row) => sum + row.amount, 0);
  return rows
    .map((row) => {
      const category = lookup.get(row._id);
      return {
        categoryId: row._id,
        name: category?.name ?? "Uncategorised",
        icon: category?.icon ?? "tag",
        color: category?.color ?? "slate",
        amount: row.amount,
        count: row.total,
        percentage: grand === 0 ? 0 : roundTo((row.amount / grand) * 100, 1),
      };
    })
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name));
}

export async function getDashboardSummary(userId: string, month: MonthKey, today?: IsoDate): Promise<DashboardSummary> {
  const previous = previousMonthKey(month);
  const currentRange = monthRange(month);
  const previousRange = monthRange(previous);

  const [allTime, openingBalance, currentTx, previousTx, categories, series] = await Promise.all([
    getAllTimeTotals(userId),
    getBalanceBefore(userId, currentRange.start),
    listTransactionsInRange(userId, currentRange.start, currentRange.end),
    listTransactionsInRange(userId, previousRange.start, previousRange.end),
    listCategories(userId),
    getMonthlySeries(userId, listMonthKeys(month, 6)),
  ]);

  const bothMonths = [...currentTx, ...previousTx];
  const untilDate = today && monthKeyOf(today) === month ? today : null;
  return {
    month,
    totalBalance: allTime.balance,
    allTimeIncome: allTime.income,
    allTimeExpenses: allTime.expenses,
    openingBalance,
    dailyBalance: dailyBalanceSeries(currentTx, month, openingBalance, untilDate),
    current: calculateMonthTotals(currentTx, month),
    previous: calculateMonthTotals(previousTx, previous),
    comparison: monthlyComparison(bothMonths, month, categories, previous),
    expenseCategories: categoryBreakdown(currentTx, "EXPENSE", categories),
    incomeCategories: categoryBreakdown(currentTx, "INCOME", categories),
    largestExpenses: largestExpenses(currentTx, 5),
    recentTransactions: currentTx.slice(0, 8),
    series,
  };
}

export async function getAnalyticsOverview(userId: string, range: RangePreset, endMonth: MonthKey): Promise<AnalyticsOverview> {
  const allTime = await getAllTimeTotals(userId);
  let months = monthsForRange(endMonth, range);
  if (months === null) {
    const first = allTime.firstMonth ?? endMonth;
    months = monthsBetween(first < endMonth ? first : endMonth, endMonth);
    if (months.length > 240) months = months.slice(-240);
  }
  const from = monthRange(months[0]!).start;
  const to = monthRange(months[months.length - 1]!).end;
  const previous = previousMonthKey(endMonth);
  const comparisonRange = { start: monthRange(previous).start, end: monthRange(endMonth).end };

  const [series, expenseCategories, incomeCategories, largest, comparisonTx, categories] = await Promise.all([
    getMonthlySeries(userId, months),
    getCategoryTotals(userId, "EXPENSE", from, to),
    getCategoryTotals(userId, "INCOME", from, to),
    listTransactions(userId, transactionFiltersSchema.parse({ from, to, type: "EXPENSE", sort: "amount", dir: "desc", pageSize: 10 })),
    listTransactionsInRange(userId, comparisonRange.start, comparisonRange.end),
    listCategories(userId),
  ]);

  const income = series.reduce((sum, m) => sum + m.income, 0);
  const expenses = series.reduce((sum, m) => sum + m.expenses, 0);
  const withActivity = series.filter((m) => m.transactionCount > 0);
  const bestMonth = withActivity.length ? withActivity.reduce((best, m) => (m.savings > best.savings ? m : best)) : null;
  const worstMonth = withActivity.length ? withActivity.reduce((worst, m) => (m.expenses > worst.expenses ? m : worst)) : null;

  return {
    range,
    months,
    series,
    totals: { income, expenses, savings: calculateSavings(income, expenses), savingsRate: calculateSavingsRate(income, expenses) },
    averages: averageMonthly(withActivity.length ? withActivity : series),
    expenseCategories,
    incomeCategories,
    largestExpenses: largest.items,
    comparison: monthlyComparison(comparisonTx, endMonth, categories, previous),
    bestMonth,
    worstMonth,
  };
}
