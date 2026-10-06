import { compareIsoDates, monthKeyOf } from "@/lib/dates";
import type { IsoDate, MonthKey, SavingsEntryKind, SavingsGoal, SavingsGoalProgress, SavingsMonth } from "@/types";
import { roundTo } from "./calculations";

/**
 * Pure savings maths. The savings module is separate from the monthly tracker: money added to
 * savings (DEPOSIT) raises the savings balance, money used from savings (SPEND) lowers it, and
 * neither touches monthly income, expenses or the main balance.
 */

export interface SavingsEntryLike {
  kind: SavingsEntryKind;
  amount: number;
  date: IsoDate;
  categoryId?: string | null;
}

export function savingsTotals(entries: Iterable<SavingsEntryLike>): { added: number; used: number; balance: number } {
  let added = 0;
  let used = 0;
  for (const e of entries) {
    if (e.kind === "DEPOSIT") added += e.amount;
    else used += e.amount;
  }
  return { added, used, balance: added - used };
}

/**
 * Month-by-month money in / out with the running balance at each month end.
 * `openingBalance` is the balance before the first month; missing months are zero-filled.
 */
export function savingsMonthlySeries(
  rows: Iterable<{ month: MonthKey; added: number; used: number; count: number }>,
  months: MonthKey[],
  openingBalance = 0,
): SavingsMonth[] {
  const byMonth = new Map(Array.from(rows, (r) => [r.month, r]));
  let balance = openingBalance;
  return months.map((month) => {
    const row = byMonth.get(month);
    const added = row?.added ?? 0;
    const used = row?.used ?? 0;
    balance += added - used;
    return { month, added, used, net: added - used, balance, entryCount: row?.count ?? 0 };
  });
}

/** Whole months from `from` to `to` inclusive (Oct→Mar = 6). 0 when `to` is before `from`. */
export function monthsInclusive(from: MonthKey, to: MonthKey): number {
  const [fy, fm] = from.split("-").map(Number) as [number, number];
  const [ty, tm] = to.split("-").map(Number) as [number, number];
  return Math.max(0, (ty - fy) * 12 + (tm - fm) + 1);
}

/**
 * Progress of one goal. A goal linked to a savings category counts deposits earmarked for it;
 * an unlinked goal tracks the whole savings balance. `monthlyNeeded` spreads what is left over
 * the months up to the target date, rounded up to whole rupees; past the date, all of it is due.
 */
export function goalProgress(
  goal: SavingsGoal,
  earmarked: ReadonlyMap<string, number>,
  balance: number,
  today: IsoDate,
  categoryNames: ReadonlyMap<string, string>,
): SavingsGoalProgress {
  const saved = Math.max(0, goal.categoryId ? (earmarked.get(goal.categoryId) ?? 0) : balance);
  const remaining = Math.max(0, goal.targetAmount - saved);
  const percentage = goal.targetAmount <= 0 ? 0 : roundTo((saved / goal.targetAmount) * 100, 1);
  let monthsLeft: number | null = null;
  let monthlyNeeded: number | null = null;
  if (goal.targetDate) {
    monthsLeft = compareIsoDates(goal.targetDate, today) < 0 ? 0 : monthsInclusive(monthKeyOf(today), monthKeyOf(goal.targetDate));
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

/** Unfinished goals first (nearest deadline first), then finished ones. */
export function sortGoals(goals: SavingsGoalProgress[]): SavingsGoalProgress[] {
  return [...goals].sort((a, b) => {
    if (a.complete !== b.complete) return a.complete ? 1 : -1;
    if (a.targetDate && b.targetDate) return compareIsoDates(a.targetDate, b.targetDate);
    if (a.targetDate) return -1;
    if (b.targetDate) return 1;
    return a.name.localeCompare(b.name);
  });
}
