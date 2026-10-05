import { calculateSavingsRate } from "@/lib/analytics/calculations";
import { getCategoryTotals, getMonthlySeries } from "@/lib/analytics/queries";
import { goalProgress, savedByCategoryMap, sortGoals } from "@/lib/analytics/savings";
import { getDb } from "@/lib/db";
import { newId, type SavingsGoalDoc } from "@/lib/db/schema";
import { addDays, listMonthKeys, previousMonthKey } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { savingsGoalInputSchema, savingsGoalUpdateSchema, type SavingsGoalInput, type SavingsGoalUpdate } from "@/lib/validation/savings";
import { transactionFiltersSchema } from "@/lib/validation/transaction";
import type { IsoDate, MonthKey, SavingsGoal, SavingsGoalProgress, SavingsOverview } from "@/types";
import { listCategories } from "./categories";
import { countSavingsNotes } from "./savings-notes";
import { listTransactions } from "./transactions";

const ALL_TIME = { from: "0000-01-01", to: "9999-12-31" } as const;

function toGoal(doc: SavingsGoalDoc): SavingsGoal {
  return {
    id: doc._id,
    name: doc.name,
    targetAmount: doc.targetAmount,
    targetDate: doc.targetDate,
    categoryId: doc.categoryId,
    color: doc.color,
    archived: doc.archived,
  };
}

async function assertDestination(userId: string, categoryId: string | null | undefined): Promise<void> {
  if (!categoryId) return;
  const db = await getDb();
  const category = await db.categories.findOne({ _id: categoryId, userId }, { projection: { type: 1 } });
  if (!category) throw AppError.notFound("Savings destination");
  if (category.type !== "SAVINGS") throw AppError.badRequest("Goals can only track savings destinations");
}

export async function listSavingsGoals(userId: string, options: { includeArchived?: boolean } = {}): Promise<SavingsGoal[]> {
  const db = await getDb();
  const docs = await db.savingsGoals
    .find(options.includeArchived ? { userId } : { userId, archived: false })
    .sort({ createdAt: 1 })
    .toArray();
  return docs.map(toGoal);
}

/** Goals with progress computed from the all-time amount saved into each goal's destination. */
export async function listGoalProgress(userId: string, today: IsoDate, options: { includeArchived?: boolean } = {}): Promise<SavingsGoalProgress[]> {
  const [goals, destinations, categories] = await Promise.all([
    listSavingsGoals(userId, options),
    getCategoryTotals(userId, "SAVINGS", ALL_TIME.from, ALL_TIME.to),
    listCategories(userId),
  ]);
  const names = new Map(categories.map((c) => [c.id, c.name]));
  return sortGoals(goals.map((g) => goalProgress(g, savedByCategoryMap(destinations), today, names)));
}

export async function createSavingsGoal(userId: string, rawInput: SavingsGoalInput): Promise<SavingsGoal> {
  const input = savingsGoalInputSchema.parse(rawInput);
  await assertDestination(userId, input.categoryId);
  const db = await getDb();
  const now = new Date();
  const doc: SavingsGoalDoc = { _id: newId(), userId, ...input, archived: false, createdAt: now, updatedAt: now };
  await db.savingsGoals.insertOne(doc);
  return toGoal(doc);
}

export async function updateSavingsGoal(userId: string, id: string, rawUpdate: SavingsGoalUpdate): Promise<SavingsGoal> {
  const update = savingsGoalUpdateSchema.parse(rawUpdate);
  await assertDestination(userId, update.categoryId);
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

/** Everything the Savings page shows, in one parallel round of queries. */
export async function getSavingsOverview(userId: string, month: MonthKey, today: IsoDate): Promise<SavingsOverview> {
  const since = addDays(today, -90);
  const [series, destinations, goals, recent, noteCount] = await Promise.all([
    getMonthlySeries(userId, listMonthKeys(month, 12)),
    getCategoryTotals(userId, "SAVINGS", ALL_TIME.from, ALL_TIME.to),
    listGoalProgress(userId, today),
    listTransactions(userId, transactionFiltersSchema.parse({ type: "SAVINGS", from: since, pageSize: 50 })),
    countSavingsNotes(userId),
  ]);
  const current = series.find((m) => m.month === month) ?? series[series.length - 1]!;
  const previous = series.find((m) => m.month === previousMonthKey(month));
  const savedAllTime = destinations.reduce((sum, d) => sum + d.amount, 0);
  return {
    month,
    savedThisMonth: current.saved,
    savedLastMonth: previous?.saved ?? 0,
    savedAllTime,
    keptThisMonth: current.savings,
    unallocatedThisMonth: current.savings - current.saved,
    savingsRate: calculateSavingsRate(current.income, current.expenses),
    destinations,
    series,
    goals,
    recentEntries: recent.items.slice(0, 10),
    entriesWithoutNotes: recent.items.filter((t) => !t.journal).slice(0, 10),
    noteCount,
  };
}
