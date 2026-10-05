import { describe, expect, it } from "vitest";
import type { TransactionLike } from "@/types";
import {
  averageMonthly,
  calculateBalance,
  calculateExpenses,
  calculateIncome,
  calculateMonthTotals,
  calculateMonthlyExpenses,
  calculateMonthlyIncome,
  calculateSavings,
  calculateSavingsRate,
  categoryBreakdown,
  compareMetrics,
  filterByDateRange,
  filterByMonth,
  largestExpenses,
  monthlyComparison,
  monthlySeries,
  monthsForRange,
  percentChange,
} from "./calculations";

const CATEGORIES = [
  { id: "food", name: "Food", icon: "utensils", color: "orange" },
  { id: "shopping", name: "Shopping", icon: "shopping-bag", color: "fuchsia" },
  { id: "bills", name: "Bills", icon: "receipt", color: "amber" },
  { id: "transport", name: "Transport", icon: "car", color: "blue" },
  { id: "salary", name: "Salary", icon: "briefcase", color: "emerald" },
];

// Amounts in paise: ₹55,000 = 5_500_000
const tx = (type: "INCOME" | "EXPENSE", rupees: number, date: string, categoryId = "food", description = ""): TransactionLike => ({
  type,
  amount: rupees * 100,
  date,
  categoryId,
  description,
});

const SEPTEMBER: TransactionLike[] = [
  tx("INCOME", 55_000, "2026-09-01", "salary", "Salary"),
  tx("EXPENSE", 4_500, "2026-09-03", "food", "Food"),
  tx("EXPENSE", 3_200, "2026-09-10", "shopping", "Headphones"),
  tx("EXPENSE", 4_000, "2026-09-12", "bills", "Bills"),
  tx("EXPENSE", 2_100, "2026-09-20", "transport", "Transport"),
  tx("EXPENSE", 2_750, "2026-09-30", "food", "Dinner"),
];

const AUGUST: TransactionLike[] = [
  tx("INCOME", 48_000, "2026-08-01", "salary"),
  tx("EXPENSE", 19_200, "2026-08-15", "bills"),
];

describe("basic totals", () => {
  it("calculates income, expenses and balance in integer paise", () => {
    expect(calculateIncome(SEPTEMBER)).toBe(5_500_000);
    expect(calculateExpenses(SEPTEMBER)).toBe(1_655_000);
    expect(calculateBalance(SEPTEMBER)).toBe(3_845_000);
  });

  it("balance across all months = all income − all expenses", () => {
    expect(calculateBalance([...SEPTEMBER, ...AUGUST])).toBe(3_845_000 + 2_880_000);
  });

  it("handles empty input", () => {
    expect(calculateBalance([])).toBe(0);
    expect(calculateIncome([])).toBe(0);
    expect(calculateExpenses([])).toBe(0);
  });

  it("does not lose precision on large INR amounts", () => {
    const big = [tx("INCOME", 9_99_99_99_999, "2026-01-01"), tx("EXPENSE", 1, "2026-01-02")];
    expect(calculateBalance(big)).toBe(9_99_99_99_999 * 100 - 100);
  });

  it("supports a negative balance when expenses exceed income", () => {
    expect(calculateBalance([tx("INCOME", 100, "2026-01-01"), tx("EXPENSE", 250, "2026-01-02")])).toBe(-15_000);
  });
});

describe("savings", () => {
  it("savings = income − expenses", () => {
    expect(calculateSavings(5_500_000, 1_655_000)).toBe(3_845_000);
    expect(calculateSavings(0, 1_000)).toBe(-1_000);
  });

  it("savings rate is a percentage with one decimal", () => {
    expect(calculateSavingsRate(5_500_000, 1_655_000)).toBe(69.9);
    expect(calculateSavingsRate(100_000, 0)).toBe(100);
  });

  it("never divides by zero income", () => {
    expect(calculateSavingsRate(0, 0)).toBeNull();
    expect(calculateSavingsRate(0, 50_000)).toBeNull();
  });

  it("can be negative when overspending", () => {
    expect(calculateSavingsRate(100_000, 150_000)).toBe(-50);
  });
});

describe("month filtering and monthly totals", () => {
  const all = [...SEPTEMBER, ...AUGUST, tx("EXPENSE", 10, "2026-10-01")];

  it("filters by month key", () => {
    expect(filterByMonth(all, "2026-09")).toHaveLength(6);
    expect(filterByMonth(all, "2026-08")).toHaveLength(2);
    expect(filterByMonth(all, "2026-10")).toHaveLength(1);
    expect(filterByMonth(all, "2026-07")).toHaveLength(0);
  });

  it("monthly income / expenses", () => {
    expect(calculateMonthlyIncome(all, "2026-09")).toBe(5_500_000);
    expect(calculateMonthlyExpenses(all, "2026-09")).toBe(1_655_000);
    expect(calculateMonthlyIncome(all, "2026-08")).toBe(4_800_000);
    expect(calculateMonthlyExpenses(all, "2026-08")).toBe(1_920_000);
  });

  it("month boundaries are inclusive at both ends", () => {
    const edge = [tx("EXPENSE", 1, "2026-09-01"), tx("EXPENSE", 2, "2026-09-30"), tx("EXPENSE", 4, "2026-10-01"), tx("EXPENSE", 8, "2026-08-31")];
    expect(calculateMonthlyExpenses(edge, "2026-09")).toBe(300);
  });

  it("handles January and December across a year boundary", () => {
    const list = [tx("EXPENSE", 1, "2025-12-31"), tx("EXPENSE", 2, "2026-01-01"), tx("EXPENSE", 4, "2026-01-31"), tx("EXPENSE", 8, "2026-12-31")];
    expect(calculateMonthlyExpenses(list, "2025-12")).toBe(100);
    expect(calculateMonthlyExpenses(list, "2026-01")).toBe(600);
    expect(calculateMonthlyExpenses(list, "2026-12")).toBe(800);
  });

  it("handles leap years (29 Feb belongs to February)", () => {
    const list = [tx("EXPENSE", 1, "2024-02-29"), tx("EXPENSE", 2, "2024-03-01")];
    expect(calculateMonthlyExpenses(list, "2024-02")).toBe(100);
    expect(calculateMonthlyExpenses(list, "2024-03")).toBe(200);
  });

  it("filterByDateRange supports open ends", () => {
    expect(filterByDateRange(all, "2026-09-10", null)).toHaveLength(5);
    expect(filterByDateRange(all, null, "2026-08-31")).toHaveLength(2);
    expect(filterByDateRange(all, "2026-09-10", "2026-09-12")).toHaveLength(2);
  });

  it("calculateMonthTotals bundles everything", () => {
    const totals = calculateMonthTotals(all, "2026-09");
    expect(totals).toEqual({
      month: "2026-09",
      income: 5_500_000,
      expenses: 1_655_000,
      savings: 3_845_000,
      savingsRate: 69.9,
      saved: 0,
      transactionCount: 6,
    });
  });

  it("zero income and zero expenses months", () => {
    expect(calculateMonthTotals([], "2026-05")).toEqual({
      month: "2026-05",
      income: 0,
      expenses: 0,
      savings: 0,
      savingsRate: null,
      saved: 0,
      transactionCount: 0,
    });
  });
});

describe("category breakdown", () => {
  it("groups amounts, counts and percentages", () => {
    const items = categoryBreakdown(SEPTEMBER, "EXPENSE", CATEGORIES);
    expect(items.map((i) => i.name)).toEqual(["Food", "Bills", "Shopping", "Transport"]);
    expect(items[0]).toMatchObject({ categoryId: "food", amount: 725_000, count: 2, percentage: 43.8 });
    expect(items.reduce((sum, i) => sum + i.amount, 0)).toBe(1_655_000);
    expect(Math.round(items.reduce((sum, i) => sum + i.percentage, 0))).toBe(100);
  });

  it("returns an empty list when there is nothing of that type", () => {
    expect(categoryBreakdown(SEPTEMBER.filter((t) => t.type === "INCOME"), "EXPENSE", CATEGORIES)).toEqual([]);
  });

  it("reports unknown categories as Uncategorised", () => {
    const items = categoryBreakdown([tx("EXPENSE", 10, "2026-09-01", "ghost")], "EXPENSE", CATEGORIES);
    expect(items[0]).toMatchObject({ name: "Uncategorised", percentage: 100 });
  });
});

describe("comparison", () => {
  it("percentChange rounds to one decimal and guards zero", () => {
    expect(percentChange(5_500_000, 4_800_000)).toBe(14.6);
    expect(percentChange(1_655_000, 1_920_000)).toBe(-13.8);
    expect(percentChange(3_845_000, 2_880_000)).toBe(33.5);
    expect(percentChange(100, 0)).toBeNull();
    expect(percentChange(0, 0)).toBeNull();
  });

  it("compareMetrics includes delta", () => {
    expect(compareMetrics(5_500_000, 4_800_000)).toEqual({ current: 5_500_000, previous: 4_800_000, delta: 700_000, changePercent: 14.6 });
  });

  it("monthlyComparison matches the spec example", () => {
    const result = monthlyComparison([...SEPTEMBER, ...AUGUST], "2026-09", CATEGORIES);
    expect(result.previousMonth).toBe("2026-08");
    expect(result.income.changePercent).toBe(14.6);
    expect(result.expenses.changePercent).toBe(-13.8);
    expect(result.savings.changePercent).toBe(33.5);
    const bills = result.categories.find((c) => c.categoryId === "bills");
    expect(bills).toMatchObject({ current: 400_000, previous: 1_920_000, delta: -1_520_000 });
    const food = result.categories.find((c) => c.categoryId === "food");
    expect(food?.changePercent).toBeNull();
  });

  it("works across the January / December boundary", () => {
    const list = [tx("INCOME", 100, "2025-12-05"), tx("INCOME", 150, "2026-01-05")];
    const result = monthlyComparison(list, "2026-01", CATEGORIES);
    expect(result.previousMonth).toBe("2025-12");
    expect(result.income.changePercent).toBe(50);
  });
});

describe("largest expenses and series", () => {
  it("largestExpenses sorts by amount then recency", () => {
    const top = largestExpenses(SEPTEMBER, 2);
    expect(top.map((t) => t.description)).toEqual(["Food", "Bills"]);
    expect(largestExpenses(SEPTEMBER, 0)).toEqual([]);
  });

  it("monthlySeries zero-fills missing months in order", () => {
    const series = monthlySeries([...SEPTEMBER, ...AUGUST], ["2026-07", "2026-08", "2026-09"]);
    expect(series.map((m) => m.month)).toEqual(["2026-07", "2026-08", "2026-09"]);
    expect(series[0]).toMatchObject({ income: 0, expenses: 0, savings: 0, savingsRate: null });
    expect(series[2]).toMatchObject({ income: 5_500_000, expenses: 1_655_000 });
  });

  it("averageMonthly returns integers", () => {
    const series = monthlySeries([...SEPTEMBER, ...AUGUST], ["2026-08", "2026-09"]);
    expect(averageMonthly(series)).toEqual({ income: 5_150_000, expenses: 1_787_500, savings: 3_362_500 });
    expect(averageMonthly([])).toEqual({ income: 0, expenses: 0, savings: 0 });
  });

  it("monthsForRange builds trailing windows", () => {
    expect(monthsForRange("2026-02", "3m")).toEqual(["2025-12", "2026-01", "2026-02"]);
    expect(monthsForRange("2026-09", "12m")?.[0]).toBe("2025-10");
    expect(monthsForRange("2026-09", "all")).toBeNull();
  });
});
