import { createHash } from "node:crypto";
import { formatMonthLabel } from "@/lib/dates";
import { formatCurrency, formatPercent, paiseToRupees } from "@/lib/money";
import type { DashboardSummary, InsightKind, MonthTotals, MonthlyComparison } from "@/types";

/**
 * Deterministic facts handed to the AI.
 *
 * Every number here is calculated by application code (see `lib/analytics`). The model only
 * receives finished figures, both as rupee numbers and pre-formatted strings, so it can quote
 * them verbatim and never has to do arithmetic.
 */

export interface MoneyFact {
  rupees: number;
  formatted: string;
}

export function moneyFact(paise: number): MoneyFact {
  return { rupees: paiseToRupees(paise), formatted: formatCurrency(paise) };
}

export function changeFact(changePercent: number | null): string {
  if (changePercent === null) return "n/a (no data last month)";
  if (changePercent === 0) return "unchanged";
  return `${changePercent > 0 ? "up" : "down"} ${Math.abs(changePercent).toFixed(1)}%`;
}

function monthFacts(totals: MonthTotals) {
  return {
    month: formatMonthLabel(totals.month),
    income: moneyFact(totals.income),
    expenses: moneyFact(totals.expenses),
    savings: moneyFact(totals.savings),
    savingsRate: totals.savingsRate,
    savingsRateFormatted: totals.savingsRate === null ? "n/a (no income)" : formatPercent(totals.savingsRate),
    transactionCount: totals.transactionCount,
  };
}

function comparisonFacts(comparison: MonthlyComparison) {
  return {
    currentMonth: formatMonthLabel(comparison.currentMonth),
    previousMonth: formatMonthLabel(comparison.previousMonth),
    income: { current: moneyFact(comparison.income.current), previous: moneyFact(comparison.income.previous), change: changeFact(comparison.income.changePercent) },
    expenses: { current: moneyFact(comparison.expenses.current), previous: moneyFact(comparison.expenses.previous), change: changeFact(comparison.expenses.changePercent) },
    savings: { current: moneyFact(comparison.savings.current), previous: moneyFact(comparison.savings.previous), change: changeFact(comparison.savings.changePercent) },
    categoryChanges: comparison.categories.slice(0, 6).map((c) => ({
      category: c.name,
      current: moneyFact(c.current),
      previous: moneyFact(c.previous),
      change: changeFact(c.changePercent),
    })),
  };
}

export function buildMonthlyFacts(summary: DashboardSummary) {
  const current = monthFacts(summary.current);
  const top = summary.expenseCategories[0];
  return {
    kind: "MONTHLY" as const,
    month: current.month,
    incomeFormatted: current.income.formatted,
    expensesFormatted: current.expenses.formatted,
    savingsFormatted: current.savings.formatted,
    savingsRateFormatted: current.savingsRateFormatted,
    topExpenseCategory: top ? top.name : null,
    topExpenseCategoryAmount: top ? top.amount && moneyFact(top.amount).formatted : null,
    totals: current,
    totalBalanceAllTime: moneyFact(summary.totalBalance),
    expenseCategories: summary.expenseCategories.slice(0, 8).map((c) => ({
      category: c.name,
      amount: moneyFact(c.amount),
      shareOfExpenses: `${c.percentage.toFixed(1)}%`,
      transactions: c.count,
    })),
    incomeSources: summary.incomeCategories.slice(0, 5).map((c) => ({
      category: c.name,
      amount: moneyFact(c.amount),
      shareOfIncome: `${c.percentage.toFixed(1)}%`,
    })),
    largestExpenses: summary.largestExpenses.slice(0, 5).map((t) => ({
      description: t.description,
      category: t.category.name,
      amount: moneyFact(t.amount),
      date: t.date,
    })),
    comparedToPreviousMonth: {
      income: changeFact(summary.comparison.income.changePercent),
      expenses: changeFact(summary.comparison.expenses.changePercent),
      savings: changeFact(summary.comparison.savings.changePercent),
    },
    recentMonths: summary.series.map((m) => ({
      month: formatMonthLabel(m.month, { style: "short" }),
      income: moneyFact(m.income).formatted,
      expenses: moneyFact(m.expenses).formatted,
      savings: moneyFact(m.savings).formatted,
    })),
  };
}

export function buildSpendingFacts(summary: DashboardSummary) {
  const current = monthFacts(summary.current);
  const top = summary.expenseCategories[0];
  const averageExpense =
    summary.current.transactionCount > 0 && summary.expenseCategories.length > 0
      ? Math.round(summary.current.expenses / Math.max(1, summary.expenseCategories.reduce((n, c) => n + c.count, 0)))
      : 0;
  return {
    kind: "SPENDING" as const,
    month: current.month,
    expensesFormatted: current.expenses.formatted,
    incomeFormatted: current.income.formatted,
    savingsFormatted: current.savings.formatted,
    savingsRateFormatted: current.savingsRateFormatted,
    topExpenseCategory: top ? top.name : null,
    totalExpenses: current.expenses,
    expenseTransactionCount: summary.expenseCategories.reduce((n, c) => n + c.count, 0),
    averageExpenseTransaction: moneyFact(averageExpense),
    expenseCategories: summary.expenseCategories.map((c) => ({
      category: c.name,
      amount: moneyFact(c.amount),
      shareOfExpenses: `${c.percentage.toFixed(1)}%`,
      transactions: c.count,
    })),
    largestExpenses: summary.largestExpenses.map((t) => ({
      description: t.description,
      category: t.category.name,
      amount: moneyFact(t.amount),
      date: t.date,
      tags: t.tags.map((tag) => tag.name),
    })),
    categoryChangesVsPreviousMonth: summary.comparison.categories.slice(0, 6).map((c) => ({
      category: c.name,
      thisMonth: moneyFact(c.current).formatted,
      lastMonth: moneyFact(c.previous).formatted,
      change: changeFact(c.changePercent),
    })),
  };
}

export function buildComparisonFacts(summary: DashboardSummary) {
  const current = monthFacts(summary.current);
  return {
    kind: "COMPARISON" as const,
    month: current.month,
    incomeFormatted: current.income.formatted,
    expensesFormatted: current.expenses.formatted,
    savingsFormatted: current.savings.formatted,
    savingsRateFormatted: current.savingsRateFormatted,
    topExpenseCategory: summary.expenseCategories[0]?.name ?? null,
    current: monthFacts(summary.current),
    previous: monthFacts(summary.previous),
    comparison: comparisonFacts(summary.comparison),
  };
}

export type InsightFacts =
  | ReturnType<typeof buildMonthlyFacts>
  | ReturnType<typeof buildSpendingFacts>
  | ReturnType<typeof buildComparisonFacts>;

export function buildFacts(kind: InsightKind, summary: DashboardSummary): InsightFacts {
  switch (kind) {
    case "SPENDING":
      return buildSpendingFacts(summary);
    case "COMPARISON":
      return buildComparisonFacts(summary);
    case "MONTHLY":
    default:
      return buildMonthlyFacts(summary);
  }
}

/** Stable hash of the facts + model so cached insights are reused only while the data is unchanged. */
export function hashFacts(facts: unknown, provider: string, model: string | null): string {
  return createHash("sha256").update(JSON.stringify({ facts, provider, model })).digest("hex").slice(0, 32);
}
