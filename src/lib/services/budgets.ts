import { getDb } from "@/lib/db";
import { newId, type BudgetDoc } from "@/lib/db/schema";
import { AppError } from "@/lib/errors";
import { budgetInputSchema, type BudgetInput } from "@/lib/validation/budget";
import type { Budget } from "@/types";

function toBudget(doc: BudgetDoc): Budget {
  return { id: doc._id, categoryId: doc.categoryId, amount: doc.amount };
}

export async function listBudgets(userId: string): Promise<Budget[]> {
  const db = await getDb();
  const docs = await db.budgets.find({ userId }).toArray();
  return docs.map(toBudget);
}

/**
 * Set (or clear, with amount 0) the monthly budget of an expense category.
 * Returns the saved budget, or null when it was removed.
 */
export async function setBudget(userId: string, rawInput: BudgetInput): Promise<Budget | null> {
  const input = budgetInputSchema.parse(rawInput);
  const db = await getDb();
  const category = await db.categories.findOne({ _id: input.categoryId, userId }, { projection: { type: 1 } });
  if (!category) throw AppError.notFound("Category");
  if (category.type !== "EXPENSE") throw AppError.badRequest("Budgets can only be set on expense categories");

  if (input.amount === 0) {
    await db.budgets.deleteOne({ userId, categoryId: input.categoryId });
    return null;
  }
  const now = new Date();
  const doc = await db.budgets.findOneAndUpdate(
    { userId, categoryId: input.categoryId },
    { $set: { amount: input.amount, updatedAt: now }, $setOnInsert: { _id: newId(), createdAt: now } },
    { upsert: true, returnDocument: "after" },
  );
  if (!doc) throw new AppError(500, "budget_not_saved", "The budget could not be saved");
  return toBudget(doc);
}
