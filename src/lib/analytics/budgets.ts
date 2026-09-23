import type { Budget, BudgetProgress, BudgetStatus, BudgetSummary, Category, CategoryBreakdownItem } from "@/types";
import { roundTo } from "./calculations";

/** Share of the budget at which a category turns amber. */
export const BUDGET_WARNING_PERCENT = 80;

export function budgetStatus(spent: number, budget: number): BudgetStatus {
  if (budget <= 0) return "ok";
  if (spent > budget) return "over";
  return (spent / budget) * 100 >= BUDGET_WARNING_PERCENT ? "warning" : "ok";
}

function percentOf(spent: number, budget: number): number {
  return budget <= 0 ? 0 : roundTo((spent / budget) * 100, 1);
}

/**
 * Join budgets with the month's spending per category. Integer paise in, integer paise out.
 * Budgets whose category no longer exists are skipped. Items are ordered most-used first.
 */
export function calculateBudgetProgress(budgets: Budget[], spending: CategoryBreakdownItem[], categories: Category[]): BudgetSummary {
  const spentById = new Map(spending.map((s) => [s.categoryId, s.amount]));
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const items: BudgetProgress[] = budgets.flatMap((budget) => {
    const category = categoryById.get(budget.categoryId);
    if (!category || budget.amount <= 0) return [];
    const spent = spentById.get(budget.categoryId) ?? 0;
    return [
      {
        categoryId: category.id,
        name: category.name,
        icon: category.icon,
        color: category.color,
        budget: budget.amount,
        spent,
        remaining: budget.amount - spent,
        percentage: percentOf(spent, budget.amount),
        status: budgetStatus(spent, budget.amount),
      },
    ];
  });
  items.sort((a, b) => b.percentage - a.percentage || a.name.localeCompare(b.name));

  const totalBudget = items.reduce((sum, i) => sum + i.budget, 0);
  const totalSpent = items.reduce((sum, i) => sum + i.spent, 0);
  return {
    items,
    totalBudget,
    totalSpent,
    totalRemaining: totalBudget - totalSpent,
    percentage: percentOf(totalSpent, totalBudget),
    status: budgetStatus(totalSpent, totalBudget),
    overCount: items.filter((i) => i.status === "over").length,
  };
}

/** Even daily allowance for the rest of the month (paise, floored); 0 when nothing is left. */
export function dailyAllowance(remaining: number, daysLeft: number): number {
  if (remaining <= 0 || daysLeft <= 0) return 0;
  return Math.floor(remaining / daysLeft);
}
