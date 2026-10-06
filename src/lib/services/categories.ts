import { getDb } from "@/lib/db";
import { newId, type CategoryDoc } from "@/lib/db/schema";
import { AppError } from "@/lib/errors";
import { categoryInputSchema, categoryUpdateSchema, type CategoryInput, type CategoryUpdate } from "@/lib/validation/category";
import type { Category, CategoryWithStats } from "@/types";

export function toCategory(doc: CategoryDoc): Category {
  return {
    id: doc._id,
    name: doc.name,
    type: doc.type,
    icon: doc.icon,
    color: doc.color,
    isDefault: doc.isDefault,
    sortOrder: doc.sortOrder,
  };
}

const ORDER = { type: 1, sortOrder: 1, name: 1 } as const;

export async function listCategories(userId: string): Promise<Category[]> {
  const db = await getDb();
  const docs = await db.categories.find({ userId }).sort(ORDER).toArray();
  return docs.map(toCategory);
}

export async function listCategoriesWithStats(userId: string): Promise<CategoryWithStats[]> {
  const db = await getDb();
  const [docs, counts] = await Promise.all([
    db.categories.find({ userId }).sort(ORDER).toArray(),
    db.transactions.aggregate<{ _id: string; count: number }>([{ $match: { userId } }, { $group: { _id: "$categoryId", count: { $sum: 1 } } }]).toArray(),
  ]);
  const countById = new Map(counts.map((c) => [c._id, c.count]));
  return docs.map((doc) => ({ ...toCategory(doc), transactionCount: countById.get(doc._id) ?? 0 }));
}

export async function getCategory(userId: string, id: string): Promise<Category> {
  const db = await getDb();
  const doc = await db.categories.findOne({ _id: id, userId });
  if (!doc) throw AppError.notFound("Category");
  return toCategory(doc);
}

export async function createCategory(userId: string, rawInput: CategoryInput): Promise<Category> {
  const input = categoryInputSchema.parse(rawInput);
  const db = await getDb();
  const nameLower = input.name.toLowerCase();
  const duplicate = await db.categories.findOne({ userId, type: input.type, nameLower }, { projection: { _id: 1 } });
  if (duplicate) throw AppError.conflict(`A ${input.type.toLowerCase()} category named "${input.name}" already exists`);

  const [last] = await db.categories.find({ userId }).sort({ sortOrder: -1 }).limit(1).project<{ sortOrder: number }>({ sortOrder: 1 }).toArray();
  const now = new Date();
  const doc: CategoryDoc = {
    _id: newId(),
    userId,
    name: input.name,
    nameLower,
    type: input.type,
    icon: input.icon,
    color: input.color,
    isDefault: false,
    sortOrder: (last?.sortOrder ?? 0) + 1,
    createdAt: now,
    updatedAt: now,
  };
  try {
    await db.categories.insertOne(doc);
  } catch (error) {
    if ((error as { code?: number }).code === 11000) throw AppError.conflict(`A category named "${input.name}" already exists`);
    throw error;
  }
  return toCategory(doc);
}

export async function updateCategory(userId: string, id: string, rawUpdate: CategoryUpdate): Promise<Category> {
  const update = categoryUpdateSchema.parse(rawUpdate);
  const db = await getDb();
  const existing = await getCategory(userId, id);

  if (update.type && update.type !== existing.type) {
    const used = await db.transactions.countDocuments({ userId, categoryId: id }, { limit: 1 });
    if (used > 0) throw AppError.conflict("Cannot change the type of a category that already has transactions");
  }

  const nextType = update.type ?? existing.type;
  if (update.name && update.name.toLowerCase() !== existing.name.toLowerCase()) {
    const duplicate = await db.categories.findOne({ userId, type: nextType, nameLower: update.name.toLowerCase(), _id: { $ne: id } }, { projection: { _id: 1 } });
    if (duplicate) throw AppError.conflict(`A category named "${update.name}" already exists`);
  }

  const $set: Partial<CategoryDoc> = { updatedAt: new Date() };
  if (update.name !== undefined) {
    $set.name = update.name;
    $set.nameLower = update.name.toLowerCase();
  }
  if (update.type !== undefined) $set.type = update.type;
  if (update.icon !== undefined) $set.icon = update.icon;
  if (update.color !== undefined) $set.color = update.color;
  if (update.sortOrder !== undefined) $set.sortOrder = update.sortOrder;

  const result = await db.categories.findOneAndUpdate({ _id: id, userId }, { $set }, { returnDocument: "after" });
  if (!result) throw AppError.notFound("Category");
  return toCategory(result);
}

export interface DeleteCategoryOptions {
  /** Category to move existing transactions to. Required when the category is in use. */
  reassignTo?: string;
}

export interface DeleteCategoryResult {
  deleted: true;
  reassignedTransactions: number;
}

/**
 * Delete a category. If transactions (or recurring rules) use it, they must be reassigned to
 * another category of the same type; otherwise a 409 is thrown that the UI turns into a prompt.
 */
export async function deleteCategory(userId: string, id: string, options: DeleteCategoryOptions = {}): Promise<DeleteCategoryResult> {
  const db = await getDb();
  const existing = await getCategory(userId, id);

  const [usedTransactions, usedRecurring, usedSavings] = await Promise.all([
    db.transactions.countDocuments({ userId, categoryId: id }),
    db.recurring.countDocuments({ userId, categoryId: id }),
    db.savingsEntries.countDocuments({ userId, categoryId: id }),
  ]);
  const used = usedTransactions + usedSavings;
  const inUse = used + usedRecurring;

  if (inUse > 0 && !options.reassignTo) {
    throw new AppError(
      409,
      "category_in_use",
      `"${existing.name}" is used by ${used} transaction${used === 1 ? "" : "s"}. Choose a category to move them to.`,
      { transactionCount: used, recurringCount: usedRecurring },
    );
  }

  let reassigned = 0;
  if (inUse > 0 && options.reassignTo) {
    if (options.reassignTo === id) throw AppError.badRequest("Choose a different category to move transactions to");
    const target = await db.categories.findOne({ _id: options.reassignTo, userId });
    if (!target) throw AppError.notFound("Target category");
    if (target.type !== existing.type) throw AppError.badRequest("Transactions can only be moved to a category of the same type");
    const moved = await db.transactions.updateMany({ userId, categoryId: id }, { $set: { categoryId: options.reassignTo, updatedAt: new Date() } });
    reassigned = moved.modifiedCount;
    await db.recurring.updateMany({ userId, categoryId: id }, { $set: { categoryId: options.reassignTo, updatedAt: new Date() } });
    await db.savingsGoals.updateMany({ userId, categoryId: id }, { $set: { categoryId: options.reassignTo, updatedAt: new Date() } });
    const movedSavings = await db.savingsEntries.updateMany({ userId, categoryId: id }, { $set: { categoryId: options.reassignTo, updatedAt: new Date() } });
    reassigned += movedSavings.modifiedCount;
  } else {
    await db.savingsGoals.updateMany({ userId, categoryId: id }, { $set: { categoryId: null, updatedAt: new Date() } });
  }
  await Promise.all([db.categories.deleteOne({ _id: id, userId }), db.budgets.deleteMany({ userId, categoryId: id })]);
  return { deleted: true, reassignedTransactions: reassigned };
}

/** Find a category by name (case-insensitive) or create it. Used by import. */
export async function findOrCreateCategoryByName(
  userId: string,
  name: string,
  type: Category["type"],
  extras: { icon?: string; color?: string } = {},
): Promise<Category> {
  const db = await getDb();
  const doc = await db.categories.findOne({ userId, type, nameLower: name.trim().toLowerCase() });
  if (doc) return toCategory(doc);
  return createCategory(userId, categoryInputSchema.parse({ name, type, icon: extras.icon ?? "tag", color: extras.color ?? "slate" }));
}
