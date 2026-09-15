import { and, asc, count, eq, gte, lte, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { listMonthKeys, monthRange, monthsBetween, previousMonthKey } from "@/lib/dates";
import { listCategories } from "@/lib/services/categories";
import { listTransactions, listTransactionsInRange } from "@/lib/services/transactions";
import { transactionFiltersSchema } from "@/lib/validation/transaction";
import type {
  AnalyticsOverview,
  CategoryBreakdownItem,
  DashboardSummary,
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
  largestExpenses,
  monthlyComparison,
  monthsForRange,
  roundTo,
} from "./calculations";

/**
 * Database-backed analytics. Heavy aggregations (all-time totals, monthly series, category
 * totals over long ranges) run in SQL; month-level numbers reuse the pure calculation module
 * so every figure on screen comes from the same tested code path.
 */

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
  const [row] = await db
    .select({
      income: sql<string>`coalesce(sum(case when ${transactions.type} = 'INCOME' then ${transactions.amount} else 0 end), 0)`,
      expenses: sql<string>`coalesce(sum(case when ${transactions.type} = 'EXPENSE' then ${transactions.amount} else 0 end), 0)`,
      total: count(),
      first: sql<string | null>`min(${transactions.date})`,
      last: sql<string | null>`max(${transactions.date})`,
    })
    .from(transactions)
    .where(eq(transactions.userId, userId));
  const income = Number(row?.income ?? 0);
  const expenses = Number(row?.expenses ?? 0);
  return {
    income,
    expenses,
    balance: income - expenses,
    transactionCount: Number(row?.total ?? 0),
    firstMonth: row?.first ? String(row.first).slice(0, 7) : null,
    lastMonth: row?.last ? String(row.last).slice(0, 7) : null,
  };
}

/** Month-by-month totals straight from SQL, zero-filled for the requested months. */
export async function getMonthlySeries(userId: string, months: MonthKey[]): Promise<MonthTotals[]> {
  if (months.length === 0) return [];
  const db = await getDb();
  const first = months[0]!;
  const last = months[months.length - 1]!;
  const monthExpr = sql<string>`to_char(${transactions.date}, 'YYYY-MM')`;
  const rows = await db
    .select({
      month: monthExpr,
      income: sql<string>`coalesce(sum(case when ${transactions.type} = 'INCOME' then ${transactions.amount} else 0 end), 0)`,
      expenses: sql<string>`coalesce(sum(case when ${transactions.type} = 'EXPENSE' then ${transactions.amount} else 0 end), 0)`,
      total: count(),
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.date, monthRange(first).start),
        lte(transactions.date, monthRange(last).end),
      ),
    )
    .groupBy(monthExpr)
    .orderBy(asc(monthExpr));

  const byMonth = new Map(rows.map((row) => [row.month, row]));
  return months.map((month) => {
    const row = byMonth.get(month);
    const income = Number(row?.income ?? 0);
    const expenses = Number(row?.expenses ?? 0);
    return {
      month,
      income,
      expenses,
      savings: calculateSavings(income, expenses),
      savingsRate: calculateSavingsRate(income, expenses),
      transactionCount: Number(row?.total ?? 0),
    };
  });
}

/** Category totals over a date range straight from SQL. */
export async function getCategoryTotals(
  userId: string,
  type: TransactionType,
  from: string,
  to: string,
): Promise<CategoryBreakdownItem[]> {
  const db = await getDb();
  const [rows, categories] = await Promise.all([
    db
      .select({
        categoryId: transactions.categoryId,
        amount: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
        total: count(),
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, type),
          gte(transactions.date, from),
          lte(transactions.date, to),
        ),
      )
      .groupBy(transactions.categoryId),
    listCategories(userId),
  ]);
  const lookup = new Map(categories.map((c) => [c.id, c]));
  const grand = rows.reduce((sum, row) => sum + Number(row.amount), 0);
  return rows
    .map((row) => {
      const category = lookup.get(row.categoryId);
      const amount = Number(row.amount);
      return {
        categoryId: row.categoryId,
        name: category?.name ?? "Uncategorised",
        icon: category?.icon ?? "tag",
        color: category?.color ?? "slate",
        amount,
        count: Number(row.total),
        percentage: grand === 0 ? 0 : roundTo((amount / grand) * 100, 1),
      };
    })
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name));
}

export async function getDashboardSummary(userId: string, month: MonthKey): Promise<DashboardSummary> {
  const previous = previousMonthKey(month);
  const currentRange = monthRange(month);
  const previousRange = monthRange(previous);

  const [allTime, currentTx, previousTx, categories, series] = await Promise.all([
    getAllTimeTotals(userId),
    listTransactionsInRange(userId, currentRange.start, currentRange.end),
    listTransactionsInRange(userId, previousRange.start, previousRange.end),
    listCategories(userId),
    getMonthlySeries(userId, listMonthKeys(month, 6)),
  ]);

  const bothMonths = [...currentTx, ...previousTx];
  return {
    month,
    totalBalance: allTime.balance,
    allTimeIncome: allTime.income,
    allTimeExpenses: allTime.expenses,
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
    listTransactions(
      userId,
      transactionFiltersSchema.parse({ from, to, type: "EXPENSE", sort: "amount", dir: "desc", pageSize: 10 }),
    ),
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
