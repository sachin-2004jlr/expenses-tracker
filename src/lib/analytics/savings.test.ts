import { describe, expect, it } from "vitest";
import { savingsGoalInputSchema, savingsNoteInputSchema } from "@/lib/validation/savings";
import type { SavingsGoal, TransactionLike } from "@/types";
import { calculateBalance, calculateExpenses, calculateMonthTotals, calculateSaved, dailyBalanceSeries, monthlySeries } from "./calculations";
import { goalProgress, monthsInclusive, sortGoals } from "./savings";

const tx = (type: TransactionLike["type"], amount: number, date = "2026-10-03"): TransactionLike => ({ type, amount, date, categoryId: "c" });

describe("savings entries in the core calculations", () => {
  const list = [tx("INCOME", 10_000_000), tx("EXPENSE", 4_000_000), tx("SAVINGS", 3_000_000), tx("SAVINGS", 500_000, "2026-09-30")];

  it("never count as spending and never move the balance", () => {
    expect(calculateExpenses(list)).toBe(4_000_000);
    expect(calculateBalance(list)).toBe(6_000_000);
    expect(calculateSaved(list)).toBe(3_500_000);
  });

  it("are reported separately per month", () => {
    const totals = calculateMonthTotals(list, "2026-10");
    expect(totals).toMatchObject({ income: 10_000_000, expenses: 4_000_000, savings: 6_000_000, saved: 3_000_000, savingsRate: 60 });
    const [sep, oct] = monthlySeries(list, ["2026-09", "2026-10"]);
    expect(sep).toMatchObject({ expenses: 0, saved: 500_000 });
    expect(oct).toMatchObject({ expenses: 4_000_000, saved: 3_000_000 });
  });

  it("leave the daily balance line untouched", () => {
    const points = dailyBalanceSeries(list, "2026-10", 0, "2026-10-03");
    expect(points.at(-1)?.balance).toBe(6_000_000);
  });
});

describe("goal progress", () => {
  const goal: SavingsGoal = { id: "g", name: "Emergency fund", targetAmount: 30_000_000, targetDate: "2027-03-31", categoryId: "ef", color: "sky", archived: false };
  const names = new Map([["ef", "Emergency fund"]]);

  it("counts what was saved into the destination and spreads the rest over the months left", () => {
    const p = goalProgress(goal, new Map([["ef", 12_000_000]]), "2026-10-05", names);
    expect(p).toMatchObject({ saved: 12_000_000, remaining: 18_000_000, percentage: 40, monthsLeft: 6, monthlyNeeded: 3_000_000, complete: false, categoryName: "Emergency fund" });
  });

  it("is complete once the target is reached and needs nothing more", () => {
    const p = goalProgress(goal, new Map([["ef", 31_000_000]]), "2026-10-05", names);
    expect(p).toMatchObject({ remaining: 0, monthlyNeeded: 0, complete: true, percentage: 103.3 });
  });

  it("asks for everything left when the date has passed, and nothing per month without a date", () => {
    expect(goalProgress(goal, new Map(), "2027-05-01", names)).toMatchObject({ monthsLeft: 0, monthlyNeeded: 30_000_000 });
    expect(goalProgress({ ...goal, targetDate: null, categoryId: null }, new Map([["ef", 5]]), "2026-10-05", names)).toMatchObject({
      saved: 0,
      monthsLeft: null,
      monthlyNeeded: null,
      categoryName: null,
    });
  });

  it("orders unfinished goals by deadline before finished ones", () => {
    const a = goalProgress({ ...goal, id: "a", name: "A", targetDate: "2027-06-01" }, new Map(), "2026-10-05", names);
    const b = goalProgress({ ...goal, id: "b", name: "B", targetDate: "2026-12-01" }, new Map(), "2026-10-05", names);
    const done = goalProgress({ ...goal, id: "c", name: "C" }, new Map([["ef", 40_000_000]]), "2026-10-05", names);
    expect(sortGoals([done, a, b]).map((g) => g.id)).toEqual(["b", "a", "c"]);
  });

  it("counts months inclusively", () => {
    expect(monthsInclusive("2026-10", "2026-10")).toBe(1);
    expect(monthsInclusive("2026-10", "2027-03")).toBe(6);
    expect(monthsInclusive("2026-10", "2026-09")).toBe(0);
  });
});

describe("savings validation", () => {
  it("requires a note body and a positive goal target", () => {
    expect(savingsNoteInputSchema.safeParse({ body: "  ", date: "2026-10-05" }).success).toBe(false);
    expect(savingsNoteInputSchema.parse({ body: "Moved ₹30,000 into the SBI FD", date: "2026-10-05" })).toMatchObject({ title: "", pinned: false, transactionId: null });
    expect(savingsGoalInputSchema.safeParse({ name: "Car", targetAmount: 0 }).success).toBe(false);
    expect(savingsGoalInputSchema.parse({ name: "Car", targetAmount: 50_000_000 })).toMatchObject({ color: "emerald", targetDate: null, categoryId: null });
  });
});
