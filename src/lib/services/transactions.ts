import { and, asc, count, desc, eq, gte, ilike, inArray, lte, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  aiInsights,
  categories,
  recurringTransactions,
  tags,
  transactionTags,
  transactions,
  type CategoryRow,
  type TransactionRow,
} from "@/lib/db/schema";
import { monthKeyOf, monthRange } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { transactionInputSchema, type TransactionFilters, type TransactionInput } from "@/lib/validation/transaction";
import type { IsoDate, Tag, Transaction } from "@/types";
import { toCategory } from "./categories";
import { invalidateInsightsForMonths } from "./insights-cache";
import { pruneUnusedTags, setTransactionTags } from "./tags";

export interface TransactionListResult {
  items: Transaction[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  totals: { income: number; expenses: number; net: number };
}

function toTransaction(row: TransactionRow, category: CategoryRow, txTags: Tag[]): Transaction {
  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    currency: row.currency,
    description: row.description,
    categoryId: row.categoryId,
    category: toCategory(category),
    date: row.date,
    notes: row.notes,
    tags: txTags,
    recurringId: row.recurringId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function loadTagsFor(transactionIds: string[]): Promise<Map<string, Tag[]>> {
  const result = new Map<string, Tag[]>();
  if (transactionIds.length === 0) return result;
  const db = await getDb();
  const rows = await db
    .select({ transactionId: transactionTags.transactionId, id: tags.id, name: tags.name })
    .from(transactionTags)
    .innerJoin(tags, eq(tags.id, transactionTags.tagId))
    .where(inArray(transactionTags.transactionId, transactionIds))
    .orderBy(asc(tags.name));
  for (const row of rows) {
    const list = result.get(row.transactionId) ?? [];
    list.push({ id: row.id, name: row.name });
    result.set(row.transactionId, list);
  }
  return result;
}

async function hydrate(rows: { tx: TransactionRow; category: CategoryRow }[]): Promise<Transaction[]> {
  const tagMap = await loadTagsFor(rows.map((r) => r.tx.id));
  return rows.map((r) => toTransaction(r.tx, r.category, tagMap.get(r.tx.id) ?? []));
}

function buildWhere(userId: string, filters: Partial<TransactionFilters>): SQL {
  const conditions: SQL[] = [eq(transactions.userId, userId)];
  if (filters.type) conditions.push(eq(transactions.type, filters.type));
  if (filters.category) conditions.push(eq(transactions.categoryId, filters.category));
  if (filters.month) {
    const { start, end } = monthRange(filters.month);
    conditions.push(gte(transactions.date, start), lte(transactions.date, end));
  }
  if (filters.from) conditions.push(gte(transactions.date, filters.from));
  if (filters.to) conditions.push(lte(transactions.date, filters.to));
  if (filters.min !== null && filters.min !== undefined) conditions.push(gte(transactions.amount, filters.min));
  if (filters.max !== null && filters.max !== undefined) conditions.push(lte(transactions.amount, filters.max));
  if (filters.tags && filters.tags.length > 0) {
    conditions.push(
      inArray(
        transactions.id,
        sql`(select ${transactionTags.transactionId} from ${transactionTags} inner join ${tags} on ${tags.id} = ${transactionTags.tagId} where ${tags.userId} = ${userId} and ${tags.name} in ${filters.tags})`,
      ),
    );
  }
  if (filters.q) {
    const pattern = `%${filters.q.replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
    conditions.push(
      or(
        ilike(transactions.description, pattern),
        ilike(transactions.notes, pattern),
        inArray(
          transactions.categoryId,
          sql`(select ${categories.id} from ${categories} where ${categories.userId} = ${userId} and ${categories.name} ilike ${pattern})`,
        ),
        inArray(
          transactions.id,
          sql`(select ${transactionTags.transactionId} from ${transactionTags} inner join ${tags} on ${tags.id} = ${transactionTags.tagId} where ${tags.userId} = ${userId} and ${tags.name} ilike ${pattern})`,
        ),
      )!,
    );
  }
  return and(...conditions)!;
}

function orderFor(filters: Pick<TransactionFilters, "sort" | "dir">): SQL[] {
  const direction = filters.dir === "asc" ? asc : desc;
  switch (filters.sort) {
    case "amount":
      return [direction(transactions.amount), desc(transactions.date)];
    case "description":
      return [direction(transactions.description), desc(transactions.date)];
    case "category":
      return [direction(categories.name), desc(transactions.date)];
    case "createdAt":
      return [direction(transactions.createdAt)];
    case "date":
    default:
      return [direction(transactions.date), direction(transactions.createdAt)];
  }
}

export async function listTransactions(userId: string, filters: TransactionFilters): Promise<TransactionListResult> {
  const db = await getDb();
  const where = buildWhere(userId, filters);
  const offset = (filters.page - 1) * filters.pageSize;

  const [rows, [countRow], [totalsRow]] = await Promise.all([
    db
      .select({ tx: transactions, category: categories })
      .from(transactions)
      .innerJoin(categories, eq(categories.id, transactions.categoryId))
      .where(where)
      .orderBy(...orderFor(filters))
      .limit(filters.pageSize)
      .offset(offset),
    db.select({ total: count() }).from(transactions).innerJoin(categories, eq(categories.id, transactions.categoryId)).where(where),
    db
      .select({
        income: sql<string>`coalesce(sum(case when ${transactions.type} = 'INCOME' then ${transactions.amount} else 0 end), 0)`,
        expenses: sql<string>`coalesce(sum(case when ${transactions.type} = 'EXPENSE' then ${transactions.amount} else 0 end), 0)`,
      })
      .from(transactions)
      .innerJoin(categories, eq(categories.id, transactions.categoryId))
      .where(where),
  ]);

  const items = await hydrate(rows);
  const total = Number(countRow?.total ?? 0);
  const income = Number(totalsRow?.income ?? 0);
  const expenses = Number(totalsRow?.expenses ?? 0);
  return {
    items,
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    pageCount: Math.max(1, Math.ceil(total / filters.pageSize)),
    totals: { income, expenses, net: income - expenses },
  };
}

/** Every transaction in an inclusive date range, newest first. */
export async function listTransactionsInRange(userId: string, from: IsoDate, to: IsoDate): Promise<Transaction[]> {
  const db = await getDb();
  const rows = await db
    .select({ tx: transactions, category: categories })
    .from(transactions)
    .innerJoin(categories, eq(categories.id, transactions.categoryId))
    .where(and(eq(transactions.userId, userId), gte(transactions.date, from), lte(transactions.date, to)))
    .orderBy(desc(transactions.date), desc(transactions.createdAt));
  return hydrate(rows);
}

export async function listAllTransactions(userId: string): Promise<Transaction[]> {
  const db = await getDb();
  const rows = await db
    .select({ tx: transactions, category: categories })
    .from(transactions)
    .innerJoin(categories, eq(categories.id, transactions.categoryId))
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.date), desc(transactions.createdAt));
  return hydrate(rows);
}

export async function getTransaction(userId: string, id: string): Promise<Transaction> {
  const db = await getDb();
  const rows = await db
    .select({ tx: transactions, category: categories })
    .from(transactions)
    .innerJoin(categories, eq(categories.id, transactions.categoryId))
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
    .limit(1);
  if (!rows[0]) throw AppError.notFound("Transaction");
  const [item] = await hydrate(rows);
  return item!;
}

async function assertCategory(userId: string, categoryId: string, type: TransactionInput["type"]): Promise<void> {
  const db = await getDb();
  const rows = await db
    .select({ id: categories.id, type: categories.type })
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
    .limit(1);
  if (!rows[0]) throw AppError.badRequest("Choose a valid category");
  if (rows[0].type !== type) {
    throw AppError.badRequest(`Choose a${type === "INCOME" ? "n income" : "n expense"} category for this transaction`);
  }
}

export async function createTransaction(userId: string, rawInput: TransactionInput): Promise<Transaction> {
  const input = transactionInputSchema.parse(rawInput);
  await assertCategory(userId, input.categoryId, input.type);
  const db = await getDb();
  const id = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(transactions)
      .values({
        userId,
        type: input.type,
        amount: input.amount,
        description: input.description,
        categoryId: input.categoryId,
        date: input.date,
        notes: input.notes,
      })
      .returning({ id: transactions.id });
    await setTransactionTags(tx, userId, row!.id, input.tags);
    await invalidateInsightsForMonths(userId, [monthKeyOf(input.date)], tx);
    return row!.id;
  });
  return getTransaction(userId, id);
}

export async function updateTransaction(userId: string, id: string, rawInput: TransactionInput): Promise<Transaction> {
  const input = transactionInputSchema.parse(rawInput);
  const existing = await getTransaction(userId, id);
  await assertCategory(userId, input.categoryId, input.type);
  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx
      .update(transactions)
      .set({
        type: input.type,
        amount: input.amount,
        description: input.description,
        categoryId: input.categoryId,
        date: input.date,
        notes: input.notes,
      })
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
    await setTransactionTags(tx, userId, id, input.tags);
    await pruneUnusedTags(tx, userId);
    await invalidateInsightsForMonths(userId, [monthKeyOf(existing.date), monthKeyOf(input.date)], tx);
  });
  return getTransaction(userId, id);
}

export async function deleteTransaction(userId: string, id: string): Promise<{ id: string; month: string }> {
  const existing = await getTransaction(userId, id);
  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx.delete(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
    await pruneUnusedTags(tx, userId);
    await invalidateInsightsForMonths(userId, [monthKeyOf(existing.date)], tx);
  });
  return { id, month: monthKeyOf(existing.date) };
}

export async function duplicateTransaction(
  userId: string,
  id: string,
  overrides: { date?: IsoDate } = {},
): Promise<Transaction> {
  const source = await getTransaction(userId, id);
  return createTransaction(userId, {
    type: source.type,
    amount: source.amount,
    description: source.description,
    categoryId: source.categoryId,
    date: overrides.date ?? source.date,
    notes: source.notes,
    tags: source.tags.map((t) => t.name),
  });
}

export async function countTransactions(userId: string): Promise<number> {
  const db = await getDb();
  const [row] = await db.select({ total: count() }).from(transactions).where(eq(transactions.userId, userId));
  return Number(row?.total ?? 0);
}

export interface ClearDataOptions {
  /** Also delete custom categories and restore the defaults. */
  resetCategories?: boolean;
}

/** Delete every transaction, tag, recurring rule and cached insight for a user. */
export async function clearUserData(userId: string, options: ClearDataOptions = {}): Promise<{ transactions: number }> {
  const db = await getDb();
  const removed = await db.transaction(async (tx) => {
    const deleted = await tx.delete(transactions).where(eq(transactions.userId, userId)).returning({ id: transactions.id });
    await tx.delete(tags).where(eq(tags.userId, userId));
    await tx.delete(recurringTransactions).where(eq(recurringTransactions.userId, userId));
    await tx.delete(aiInsights).where(eq(aiInsights.userId, userId));
    if (options.resetCategories) {
      await tx.delete(categories).where(eq(categories.userId, userId));
    }
    return deleted.length;
  });
  return { transactions: removed };
}
