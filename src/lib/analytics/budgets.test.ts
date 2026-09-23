import { describe, expect, it } from "vitest";
import { budgetInputSchema } from "@/lib/validation/budget";
import type { Budget, Category, CategoryBreakdownItem } from "@/types";
import { budgetStatus, calculateBudgetProgress, dailyAllowance } from "./budgets";

const cat = (id: string, name: string): Category => ({ id, name, type: "EXPENSE", icon: "tag", color: "slate", isDefault: false, sortOrder: 0 });
const spend = (categoryId: string, amount: number): CategoryBreakdownItem => ({ categoryId, name: categoryId, icon: "tag", color: "slate", amount, count: 1, percentage: 0 });

describe("budgetStatus", () => {
  it("is ok below 80%, warning from 80% up to the limit, over beyond it", () => {
    expect(budgetStatus(7_999, 10_000)).toBe("ok");
    expect(budgetStatus(8_000, 10_000)).toBe("warning");
    expect(budgetStatus(10_000, 10_000)).toBe("warning");
    expect(budgetStatus(10_001, 10_000)).toBe("over");
    expect(budgetStatus(500, 0)).toBe("ok");
  });
});

describe("calculateBudgetProgress", () => {
  const categories = [cat("food", "Food"), cat("rent", "Rent"), cat("fun", "Fun")];
  const budgets: Budget[] = [
    { id: "b1", categoryId: "food", amount: 1_000_000 },
    { id: "b2", categoryId: "rent", amount: 3_500_000 },
    { id: "b3", categoryId: "fun", amount: 200_000 },
    { id: "b4", categoryId: "deleted", amount: 100_000 },
  ];

  it("joins spending, sorts by usage and totals in paise", () => {
    const summary = calculateBudgetProgress(budgets, [spend("food", 900_000), spend("fun", 250_000)], categories);
    expect(summary.items.map((i) => [i.name, i.percentage, i.status])).toEqual([
      ["Fun", 125, "over"],
      ["Food", 90, "warning"],
      ["Rent", 0, "ok"],
    ]);
    expect(summary.totalBudget).toBe(4_700_000);
    expect(summary.totalSpent).toBe(1_150_000);
    expect(summary.totalRemaining).toBe(3_550_000);
    expect(summary.percentage).toBe(24.5);
    expect(summary.overCount).toBe(1);
    expect(summary.items.find((i) => i.name === "Fun")!.remaining).toBe(-50_000);
  });

  it("returns an empty summary without budgets", () => {
    const summary = calculateBudgetProgress([], [spend("food", 100)], categories);
    expect(summary).toMatchObject({ items: [], totalBudget: 0, totalSpent: 0, percentage: 0, status: "ok", overCount: 0 });
  });
});

describe("dailyAllowance", () => {
  it("spreads what is left over the remaining days, never negative", () => {
    expect(dailyAllowance(100_000, 10)).toBe(10_000);
    expect(dailyAllowance(100_001, 3)).toBe(33_333);
    expect(dailyAllowance(-5, 3)).toBe(0);
    expect(dailyAllowance(500, 0)).toBe(0);
  });
});

describe("budgetInputSchema", () => {
  const id = "0b8f2f0e-3c1f-4d8a-9b1e-2f3c4d5e6f70";
  it("accepts zero (remove) and rejects negatives, fractions and bad ids", () => {
    expect(budgetInputSchema.safeParse({ categoryId: id, amount: 0 }).success).toBe(true);
    expect(budgetInputSchema.safeParse({ categoryId: id, amount: -1 }).success).toBe(false);
    expect(budgetInputSchema.safeParse({ categoryId: id, amount: 10.5 }).success).toBe(false);
    expect(budgetInputSchema.safeParse({ categoryId: "food", amount: 100 }).success).toBe(false);
  });
});
