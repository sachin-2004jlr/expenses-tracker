import { compareIsoDates, monthKeyOf } from "@/lib/dates";
import type { CategoryBreakdownItem, IsoDate, MonthKey, SavingsGoal, SavingsGoalProgress } from "@/types";
import { roundTo } from "./calculations";

/** Whole months from `from` to `to` inclusive (Sep→Dec = 4). 0 when `to` is before `from`. */
export function monthsInclusive(from: MonthKey, to: MonthKey): number {
  const [fy, fm] = from.split("-").map(Number) as [number, number];
  const [ty, tm] = to.split("-").map(Number) as [number, number];
  const diff = (ty - fy) * 12 + (tm - fm) + 1;
  return Math.max(0, diff);
}

/**
 * Progress of one goal from the all-time amount saved into its destination.
 * `monthlyNeeded` spreads what is left evenly over the months up to the target date; when the
 * date has passed, everything left is due now.
 */
export function goalProgress(goal: SavingsGoal, savedByCategory: ReadonlyMap<string, number>, today: IsoDate, categoryNames: ReadonlyMap<string, string>): SavingsGoalProgress {
  const saved = goal.categoryId ? (savedByCategory.get(goal.categoryId) ?? 0) : 0;
  const remaining = Math.max(0, goal.targetAmount - saved);
  const percentage = goal.targetAmount <= 0 ? 0 : roundTo((saved / goal.targetAmount) * 100, 1);
  let monthsLeft: number | null = null;
  let monthlyNeeded: number | null = null;
  if (goal.targetDate) {
    monthsLeft = compareIsoDates(goal.targetDate, today) < 0 ? 0 : monthsInclusive(monthKeyOf(today), monthKeyOf(goal.targetDate));
    // Rounded up to whole rupees: nobody plans a ₹30,555.56 monthly transfer.
    monthlyNeeded = remaining === 0 ? 0 : monthsLeft > 0 ? Math.ceil(remaining / monthsLeft / 100) * 100 : remaining;
  }
  return {
    ...goal,
    saved,
    remaining,
    percentage,
    monthsLeft,
    monthlyNeeded,
    complete: saved >= goal.targetAmount,
    categoryName: goal.categoryId ? (categoryNames.get(goal.categoryId) ?? null) : null,
  };
}

/** Goals in display order: active and incomplete first (nearest deadline first), then complete. */
export function sortGoals(goals: SavingsGoalProgress[]): SavingsGoalProgress[] {
  return [...goals].sort((a, b) => {
    if (a.complete !== b.complete) return a.complete ? 1 : -1;
    if (a.targetDate && b.targetDate) return compareIsoDates(a.targetDate, b.targetDate);
    if (a.targetDate) return -1;
    if (b.targetDate) return 1;
    return a.name.localeCompare(b.name);
  });
}

export function savedByCategoryMap(destinations: CategoryBreakdownItem[]): Map<string, number> {
  return new Map(destinations.map((d) => [d.categoryId, d.amount]));
}
