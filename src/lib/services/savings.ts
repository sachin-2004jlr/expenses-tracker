import { goalProgress, sortGoals } from "@/lib/analytics/savings";
import { getDb } from "@/lib/db";
import { newId, type SavingsGoalDoc } from "@/lib/db/schema";
import { addDays, listMonthKeys, monthRange, previousMonthKey } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { savingsEntryFiltersSchema, savingsGoalInputSchema, savingsGoalUpdateSchema, type SavingsGoalInput, type SavingsGoalUpdate } from "@/lib/validation/savings";
import type { IsoDate, MonthKey, SavingsGoal, SavingsGoalProgress, SavingsOverview } from "@/types";
import { listCategories } from "./categories";
import { getSavingsByCategory, getSavingsSeries, getSavingsTotals, listSavingsEntries } from "./savings-entries";
import { countSavingsNotes } from "./savings-notes";

function toGoal(doc: SavingsGoalDoc): SavingsGoal {
  return { id: doc._id, name: doc.name, targetAmount: doc.targetAmount, targetDate: doc.targetDate, categoryId: doc.categoryId, color: doc.color, archived: doc.archived };
}

async function assertSavingsCategory(userId: string, categoryId: string | null | undefined): Promise<void> {
  if (!categoryId) return;
  const db = await getDb();
  const category = await db.categories.findOne({ _id: categoryId, userId }, { projection: { type: 1 } });
  if (!category) throw AppError.notFound("Savings category");
  if (category.type !== "SAVINGS") throw AppError.badRequest("Goals can only be linked to savings categories");
}

export async function listSavingsGoals(userId: string, options: { includeArchived?: boolean } = {}): Promise<SavingsGoal[]> {
  const db = await getDb();
  const docs = await db.savingsGoals.find(options.includeArchived ? { userId } : { userId, archived: false }).sort({ createdAt: 1 }).toArray();
  return docs.map(toGoal);
}

/** Goals with progress: earmarked deposits for linked goals, the savings balance otherwise. */
export async function listGoalProgress(userId: string, today: IsoDate, options: { includeArchived?: boolean } = {}): Promise<SavingsGoalProgress[]> {
  const [goals, earmarked, totals, categories] = await Promise.all([
    listSavingsGoals(userId, options),
    getSavingsByCategory(userId, "DEPOSIT"),
    getSavingsTotals(userId),
    listCategories(userId),
  ]);
  const names = new Map(categories.map((c) => [c.id, c.name]));
  const byCategory = new Map(earmarked.map((e) => [e.categoryId, e.amount]));
  return sortGoals(goals.map((g) => goalProgress(g, byCategory, totals.balance, today, names)));
}

export async function createSavingsGoal(userId: string, rawInput: SavingsGoalInput): Promise<SavingsGoal> {
  const input = savingsGoalInputSchema.parse(rawInput);
  await assertSavingsCategory(userId, input.categoryId);
  const db = await getDb();
  const now = new Date();
  const doc: SavingsGoalDoc = { _id: newId(), userId, ...input, archived: false, createdAt: now, updatedAt: now };
  await db.savingsGoals.insertOne(doc);
  return toGoal(doc);
}

export async function updateSavingsGoal(userId: string, id: string, rawUpdate: SavingsGoalUpdate): Promise<SavingsGoal> {
  const update = savingsGoalUpdateSchema.parse(rawUpdate);
  await assertSavingsCategory(userId, update.categoryId);
  const db = await getDb();
  const $set: Partial<SavingsGoalDoc> = { updatedAt: new Date() };
  for (const [key, value] of Object.entries(update)) {
    if (value !== undefined) ($set as Record<string, unknown>)[key] = value;
  }
  const doc = await db.savingsGoals.findOneAndUpdate({ _id: id, userId }, { $set }, { returnDocument: "after" });
  if (!doc) throw AppError.notFound("Goal");
  return toGoal(doc);
}

export async function deleteSavingsGoal(userId: string, id: string): Promise<void> {
  const db = await getDb();
  const result = await db.savingsGoals.deleteOne({ _id: id, userId });
  if (result.deletedCount === 0) throw AppError.notFound("Goal");
}

/** Everything the savings dashboard shows, in one parallel round of queries. */
export async function getSavingsOverview(userId: string, month: MonthKey, today: IsoDate): Promise<SavingsOverview> {
  const { start, end } = monthRange(month);
  const [totals, series, usedByCategory, usedByCategoryThisMonth, goals, recent, noteCount] = await Promise.all([
    getSavingsTotals(userId),
    getSavingsSeries(userId, listMonthKeys(month, 12)),
    getSavingsByCategory(userId, "SPEND"),
    getSavingsByCategory(userId, "SPEND", { from: start, to: end }),
    listGoalProgress(userId, today),
    listSavingsEntries(userId, savingsEntryFiltersSchema.parse({ pageSize: 50 })),
    countSavingsNotes(userId),
  ]);
  const current = series.find((m) => m.month === month);
  const previous = series.find((m) => m.month === previousMonthKey(month));
  const since = addDays(today, -90);
  return {
    month,
    balance: totals.balance,
    addedAllTime: totals.added,
    usedAllTime: totals.used,
    addedThisMonth: current?.added ?? 0,
    usedThisMonth: current?.used ?? 0,
    addedLastMonth: previous?.added ?? 0,
    usedLastMonth: previous?.used ?? 0,
    series,
    usedByCategory,
    usedByCategoryThisMonth,
    goals,
    recentEntries: recent.items.slice(0, 8),
    entriesWithoutNotes: recent.items.filter((e) => !e.journal && e.date >= since).slice(0, 10),
    noteCount,
  };
}
