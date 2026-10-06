import { describe, expect, it } from "vitest";
import { savingsEntryInputSchema, savingsGoalInputSchema, savingsNoteInputSchema } from "@/lib/validation/savings";
import type { SavingsGoal } from "@/types";
import { goalProgress, monthsInclusive, savingsMonthlySeries, savingsTotals, sortGoals } from "./savings";

describe("savings totals", () => {
  it("adds deposits, subtracts what was used, independent of the monthly tracker", () => {
    expect(
      savingsTotals([
        { kind: "DEPOSIT", amount: 1_000_000, date: "2026-10-01" },
        { kind: "DEPOSIT", amount: 500_000, date: "2026-10-02" },
        { kind: "SPEND", amount: 300_000, date: "2026-10-03" },
      ]),
    ).toEqual({ added: 1_500_000, used: 300_000, balance: 1_200_000 });
  });

  it("builds a zero-filled monthly series with the running balance", () => {
    const series = savingsMonthlySeries(
      [
        { month: "2026-08", added: 1_000_000, used: 0, count: 1 },
        { month: "2026-10", added: 200_000, used: 700_000, count: 2 },
      ],
      ["2026-08", "2026-09", "2026-10"],
      100_000,
    );
    expect(series.map((m) => [m.month, m.net, m.balance])).toEqual([
      ["2026-08", 1_000_000, 1_100_000],
      ["2026-09", 0, 1_100_000],
      ["2026-10", -500_000, 600_000],
    ]);
  });
});

describe("goal progress", () => {
  const goal: SavingsGoal = { id: "g", name: "Emergency fund", targetAmount: 30_000_000, targetDate: "2027-03-31", categoryId: "ef", color: "sky", archived: false };
  const names = new Map([["ef", "Emergency fund"]]);

  it("counts earmarked deposits and spreads the rest over the months left, in whole rupees", () => {
    const p = goalProgress(goal, new Map([["ef", 12_000_000]]), 50_000_000, "2026-10-05", names);
    expect(p).toMatchObject({ saved: 12_000_000, remaining: 18_000_000, percentage: 40, monthsLeft: 6, monthlyNeeded: 3_000_000, categoryName: "Emergency fund" });
    const odd = goalProgress({ ...goal, targetAmount: 18_333_400 }, new Map(), 0, "2026-10-05", names);
    expect(odd.monthlyNeeded! % 100).toBe(0);
  });

  it("tracks the whole savings balance when not linked to a category", () => {
    const p = goalProgress({ ...goal, categoryId: null, targetDate: null }, new Map([["ef", 5]]), 7_500_000, "2026-10-05", names);
    expect(p).toMatchObject({ saved: 7_500_000, percentage: 25, monthsLeft: null, monthlyNeeded: null, categoryName: null });
  });

  it("is complete at the target, and asks for everything when the date has passed", () => {
    expect(goalProgress(goal, new Map([["ef", 31_000_000]]), 0, "2026-10-05", names)).toMatchObject({ complete: true, remaining: 0, monthlyNeeded: 0 });
    expect(goalProgress(goal, new Map(), 0, "2027-05-01", names)).toMatchObject({ monthsLeft: 0, monthlyNeeded: 30_000_000 });
  });

  it("orders unfinished goals by deadline before finished ones", () => {
    const a = goalProgress({ ...goal, id: "a", targetDate: "2027-06-01" }, new Map(), 0, "2026-10-05", names);
    const b = goalProgress({ ...goal, id: "b", targetDate: "2026-12-01" }, new Map(), 0, "2026-10-05", names);
    const done = goalProgress({ ...goal, id: "c" }, new Map([["ef", 40_000_000]]), 0, "2026-10-05", names);
    expect(sortGoals([done, a, b]).map((g) => g.id)).toEqual(["b", "a", "c"]);
  });

  it("counts months inclusively", () => {
    expect(monthsInclusive("2026-10", "2026-10")).toBe(1);
    expect(monthsInclusive("2026-10", "2027-03")).toBe(6);
    expect(monthsInclusive("2026-10", "2026-09")).toBe(0);
  });
});

describe("savings validation", () => {
  const cat = "0b8f2f0e-3c1f-4d8a-9b1e-2f3c4d5e6f70";
  it("requires a category when money is used from savings, not when it is added", () => {
    expect(savingsEntryInputSchema.safeParse({ kind: "DEPOSIT", amount: 100, description: "October savings", date: "2026-10-05" }).success).toBe(true);
    expect(savingsEntryInputSchema.safeParse({ kind: "SPEND", amount: 100, description: "Gold", date: "2026-10-05" }).success).toBe(false);
    expect(savingsEntryInputSchema.safeParse({ kind: "SPEND", amount: 100, description: "Gold", date: "2026-10-05", categoryId: cat }).success).toBe(true);
  });

  it("requires a note body and a positive goal target", () => {
    expect(savingsNoteInputSchema.safeParse({ body: "  ", date: "2026-10-05" }).success).toBe(false);
    expect(savingsNoteInputSchema.parse({ body: "Moved ₹30,000 into the SBI FD", date: "2026-10-05" })).toMatchObject({ title: "", pinned: false, entryId: null });
    expect(savingsGoalInputSchema.safeParse({ name: "Car", targetAmount: 0 }).success).toBe(false);
  });
});
