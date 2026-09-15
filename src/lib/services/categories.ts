import { and, asc, count, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { categories, recurringTransactions, transactions, type CategoryRow } from "@/lib/db/schema";
import { AppError } from "@/lib/errors";
import { categoryInputSchema, categoryUpdateSchema, type CategoryInput, type CategoryUpdate } from "@/lib/validation/category";
import type { Category, CategoryWithStats } from "@/types";

export function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    icon: row.icon,
    color: row.color,
    isDefault: row.isDefault,
    sortOrder: row.sortOrder,
  };
}

export async function listCategories(userId: string): Promise<Category[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(categories)
    .where(eq(categories.userId, userId))
    .orderBy(asc(categories.type), asc(categories.sortOrder), asc(categories.name));
  return rows.map(toCategory);
}

export async function listCategoriesWithStats(userId: string): Promise<CategoryWithStats[]> {
  const db = await getDb();
  const rows = await db
    .select({
      category: categories,
      transactionCount: sql<number>`cast(count(${transactions.id}) as integer)`,
    })
    .from(categories)
    .leftJoin(transactions, eq(transactions.categoryId, categories.id))
    .where(eq(categories.userId, userId))
    .groupBy(categories.id)
    .orderBy(asc(categories.type), asc(categories.sortOrder), asc(categories.name));
  return rows.map((row) => ({ ...toCategory(row.category), transactionCount: Number(row.transactionCount) }));
}

export async function getCategory(userId: string, id: string): Promise<Category> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, userId)))
    .limit(1);
  if (!rows[0]) throw AppError.notFound("Category");
  return toCategory(rows[0]);
}

export async function createCategory(userId: string, rawInput: CategoryInput): Promise<Category> {
  const input = categoryInputSchema.parse(rawInput);
  const db = await getDb();
  const duplicate = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.userId, userId), eq(categories.type, input.type), sql`lower(${categories.name}) = lower(${input.name})`))
    .limit(1);
  if (duplicate[0]) throw AppError.conflict(`A ${input.type.toLowerCase()} category named "${input.name}" already exists`);

  const [{ maxOrder }] = await db
    .select({ maxOrder: sql<number>`coalesce(max(${categories.sortOrder}), 0)` })
    .from(categories)
    .where(eq(categories.userId, userId));

  const [row] = await db
    .insert(categories)
    .values({ ...input, userId, sortOrder: Number(maxOrder) + 1 })
    .returning();
  return toCategory(row!);
}

export async function updateCategory(userId: string, id: string, rawUpdate: CategoryUpdate): Promise<Category> {
  const update = categoryUpdateSchema.parse(rawUpdate);
  const db = await getDb();
  const existing = await getCategory(userId, id);

  if (update.type && update.type !== existing.type) {
    const [{ used }] = await db
      .select({ used: count() })
      .from(transactions)
      .where(eq(transactions.categoryId, id));
    if (Number(used) > 0) {
      throw AppError.conflict("Cannot change the type of a category that already has transactions");
    }
  }

  if (update.name && update.name.toLowerCase() !== existing.name.toLowerCase()) {
    const duplicate = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.userId, userId),
          eq(categories.type, update.type ?? existing.type),
          sql`lower(${categories.name}) = lower(${update.name})`,
        ),
      )
      .limit(1);
    if (duplicate[0] && duplicate[0].id !== id) {
      throw AppError.conflict(`A category named "${update.name}" already exists`);
    }
  }

  const [row] = await db
    .update(categories)
    .set(update)
    .where(and(eq(categories.id, id), eq(categories.userId, userId)))
    .returning();
  return toCategory(row!);
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
export async function deleteCategory(
  userId: string,
  id: string,
  options: DeleteCategoryOptions = {},
): Promise<DeleteCategoryResult> {
  const db = await getDb();
  const existing = await getCategory(userId, id);

  const [{ used }] = await db.select({ used: count() }).from(transactions).where(eq(transactions.categoryId, id));
  const [{ usedRecurring }] = await db
    .select({ usedRecurring: count() })
    .from(recurringTransactions)
    .where(eq(recurringTransactions.categoryId, id));
  const inUse = Number(used) + Number(usedRecurring);

  if (inUse > 0 && !options.reassignTo) {
    throw new AppError(
      409,
      "category_in_use",
      `"${existing.name}" is used by ${Number(used)} transaction${Number(used) === 1 ? "" : "s"}. Choose a category to move them to.`,
      { transactionCount: Number(used), recurringCount: Number(usedRecurring) },
    );
  }

  let reassigned = 0;
  await db.transaction(async (tx) => {
    if (inUse > 0 && options.reassignTo) {
      if (options.reassignTo === id) throw AppError.badRequest("Choose a different category to move transactions to");
      const target = await tx
        .select()
        .from(categories)
        .where(and(eq(categories.id, options.reassignTo), eq(categories.userId, userId)))
        .limit(1);
      if (!target[0]) throw AppError.notFound("Target category");
      if (target[0].type !== existing.type) throw AppError.badRequest("Transactions can only be moved to a category of the same type");
      const moved = await tx
        .update(transactions)
        .set({ categoryId: options.reassignTo })
        .where(and(eq(transactions.categoryId, id), eq(transactions.userId, userId)))
        .returning({ id: transactions.id });
      reassigned = moved.length;
      await tx
        .update(recurringTransactions)
        .set({ categoryId: options.reassignTo })
        .where(and(eq(recurringTransactions.categoryId, id), eq(recurringTransactions.userId, userId)));
    }
    await tx.delete(categories).where(and(eq(categories.id, id), eq(categories.userId, userId)));
  });

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
  const rows = await db
    .select()
    .from(categories)
    .where(and(eq(categories.userId, userId), eq(categories.type, type), sql`lower(${categories.name}) = lower(${name})`))
    .limit(1);
  if (rows[0]) return toCategory(rows[0]);
  return createCategory(userId, categoryInputSchema.parse({ name, type, icon: extras.icon ?? "tag", color: extras.color ?? "slate" }));
}
