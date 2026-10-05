import type { Document, Filter, Sort } from "mongodb";
import { getDb } from "@/lib/db";
import { newId, type CategoryDoc, type TransactionDoc } from "@/lib/db/schema";
import { monthKeyOf, monthRange } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { transactionInputSchema, type TransactionFilters, type TransactionInput } from "@/lib/validation/transaction";
import type { IsoDate, Transaction } from "@/types";
import { toCategory } from "./categories";
import { journalsFor, syncTransactionJournal, unlinkTransactionJournal } from "./savings-notes";
import { normaliseTags } from "./tags";

export interface TransactionListResult {
  items: Transaction[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  totals: { income: number; expenses: number; saved: number; net: number };
}

function toTransaction(doc: TransactionDoc, category: CategoryDoc): Transaction {
  return {
    id: doc._id,
    type: doc.type,
    amount: doc.amount,
    currency: doc.currency,
    description: doc.description,
    categoryId: doc.categoryId,
    category: toCategory(category),
    date: doc.date,
    notes: doc.notes,
    tags: (doc.tags ?? []).map((name) => ({ id: name, name })),
    recurringId: doc.recurringId ?? null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

/** Attach savings journal text to SAVINGS entries (one query, skipped when there are none). */
async function withJournals(userId: string, items: Transaction[]): Promise<Transaction[]> {
  const savingIds = items.filter((t) => t.type === "SAVINGS").map((t) => t.id);
  if (savingIds.length === 0) return items;
  const journals = await journalsFor(userId, savingIds);
  return items.map((t) => (t.type === "SAVINGS" ? { ...t, journal: journals.get(t.id) ?? null } : t));
}

/** Attach category documents (one query) and drop rows whose category vanished. */
async function hydrate(userId: string, docs: TransactionDoc[]): Promise<Transaction[]> {
  if (docs.length === 0) return [];
  const db = await getDb();
  const ids = Array.from(new Set(docs.map((d) => d.categoryId)));
  const savingIds = docs.filter((d) => d.type === "SAVINGS").map((d) => d._id);
  const [categories, journals] = await Promise.all([db.categories.find({ userId, _id: { $in: ids } }).toArray(), journalsFor(userId, savingIds)]);
  const byId = new Map(categories.map((c) => [c._id, c]));
  return docs.flatMap((doc) => {
    const category = byId.get(doc.categoryId);
    if (!category) return [];
    const tx = toTransaction(doc, category);
    return [doc.type === "SAVINGS" ? { ...tx, journal: journals.get(doc._id) ?? null } : tx];
  });
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function buildFilter(userId: string, filters: Partial<TransactionFilters>): Promise<Filter<TransactionDoc>> {
  const filter: Filter<TransactionDoc> = { userId };
  if (filters.type) filter.type = filters.type;
  if (filters.category) filter.categoryId = filters.category;

  const date: { $gte?: string; $lte?: string } = {};
  if (filters.month) {
    const { start, end } = monthRange(filters.month);
    date.$gte = start;
    date.$lte = end;
  }
  if (filters.from) date.$gte = date.$gte && date.$gte > filters.from ? date.$gte : filters.from;
  if (filters.to) date.$lte = date.$lte && date.$lte < filters.to ? date.$lte : filters.to;
  if (date.$gte || date.$lte) filter.date = date;

  const amount: { $gte?: number; $lte?: number } = {};
  if (filters.min !== null && filters.min !== undefined) amount.$gte = filters.min;
  if (filters.max !== null && filters.max !== undefined) amount.$lte = filters.max;
  if (amount.$gte !== undefined || amount.$lte !== undefined) filter.amount = amount;

  if (filters.tags && filters.tags.length > 0) filter.tags = { $in: filters.tags };

  if (filters.q) {
    const regex = new RegExp(escapeRegex(filters.q), "i");
    const db = await getDb();
    const matchingCategories = await db.categories.find({ userId, name: regex }).project<{ _id: string }>({ _id: 1 }).toArray();
    filter.$or = [
      { description: regex },
      { notes: regex },
      { tags: regex },
      ...(matchingCategories.length ? [{ categoryId: { $in: matchingCategories.map((c) => c._id) } }] : []),
    ];
  }
  return filter;
}

function sortFor(filters: Pick<TransactionFilters, "sort" | "dir">): Sort {
  const direction = filters.dir === "asc" ? 1 : -1;
  switch (filters.sort) {
    case "amount":
      return { amount: direction, date: -1, _id: 1 };
    case "description":
      return { description: direction, date: -1, _id: 1 };
    case "category":
      return { "category.name": direction, date: -1, _id: 1 };
    case "createdAt":
      return { createdAt: direction, _id: 1 };
    case "date":
    default:
      return { date: direction, createdAt: direction, _id: 1 };
  }
}

export async function listTransactions(userId: string, filters: TransactionFilters): Promise<TransactionListResult> {
  const db = await getDb();
  const match = await buildFilter(userId, filters);
  const skip = (filters.page - 1) * filters.pageSize;
  const sort = sortFor(filters);

  const lookup: Document[] = [
    { $lookup: { from: "categories", localField: "categoryId", foreignField: "_id", as: "category" } },
    { $unwind: "$category" },
  ];
  const itemsPipeline: Document[] =
    filters.sort === "category"
      ? [...lookup, { $sort: sort }, { $skip: skip }, { $limit: filters.pageSize }]
      : [{ $sort: sort }, { $skip: skip }, { $limit: filters.pageSize }, ...lookup];

  const [result] = await db.transactions
    .aggregate<{
      items: (TransactionDoc & { category: CategoryDoc })[];
      total: { count: number }[];
      totals: { income: number; expenses: number; saved: number }[];
    }>([
      { $match: match },
      {
        $facet: {
          items: itemsPipeline,
          total: [{ $count: "count" }],
          totals: [
            {
              $group: {
                _id: null,
                income: { $sum: { $cond: [{ $eq: ["$type", "INCOME"] }, "$amount", 0] } },
                expenses: { $sum: { $cond: [{ $eq: ["$type", "EXPENSE"] }, "$amount", 0] } },
                saved: { $sum: { $cond: [{ $eq: ["$type", "SAVINGS"] }, "$amount", 0] } },
              },
            },
          ],
        },
      },
    ])
    .toArray();

  const items = await withJournals(
    userId,
    (result?.items ?? []).map((doc) => toTransaction(doc, doc.category)),
  );
  const total = result?.total[0]?.count ?? 0;
  const income = result?.totals[0]?.income ?? 0;
  const expenses = result?.totals[0]?.expenses ?? 0;
  const saved = result?.totals[0]?.saved ?? 0;
  return {
    items,
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    pageCount: Math.max(1, Math.ceil(total / filters.pageSize)),
    totals: { income, expenses, saved, net: income - expenses },
  };
}

/** Every transaction in an inclusive date range, newest first. */
export async function listTransactionsInRange(userId: string, from: IsoDate, to: IsoDate): Promise<Transaction[]> {
  const db = await getDb();
  const docs = await db.transactions
    .find({ userId, date: { $gte: from, $lte: to } })
    .sort({ date: -1, createdAt: -1 })
    .toArray();
  return hydrate(userId, docs);
}

export async function listAllTransactions(userId: string): Promise<Transaction[]> {
  const db = await getDb();
  const docs = await db.transactions.find({ userId }).sort({ date: -1, createdAt: -1 }).toArray();
  return hydrate(userId, docs);
}

export async function getTransaction(userId: string, id: string): Promise<Transaction> {
  const db = await getDb();
  const doc = await db.transactions.findOne({ _id: id, userId });
  if (!doc) throw AppError.notFound("Transaction");
  const [item] = await hydrate(userId, [doc]);
  if (!item) throw AppError.notFound("Transaction");
  return item;
}

async function assertCategory(userId: string, categoryId: string, type: TransactionInput["type"]): Promise<void> {
  const db = await getDb();
  const category = await db.categories.findOne({ _id: categoryId, userId }, { projection: { type: 1 } });
  if (!category) throw AppError.badRequest("Choose a valid category");
  if (category.type !== type) {
    const label = type === "INCOME" ? "an income category" : type === "EXPENSE" ? "an expense category" : "a savings destination";
    throw AppError.badRequest(`Choose ${label} for this transaction`);
  }
}

export async function createTransaction(userId: string, rawInput: TransactionInput): Promise<Transaction> {
  const input = transactionInputSchema.parse(rawInput);
  await assertCategory(userId, input.categoryId, input.type);
  const db = await getDb();
  const now = new Date();
  const doc: TransactionDoc = {
    _id: newId(),
    userId,
    type: input.type,
    amount: input.amount,
    currency: "INR",
    description: input.description,
    categoryId: input.categoryId,
    date: input.date,
    notes: input.notes,
    tags: normaliseTags(input.tags),
    recurringId: null,
    createdAt: now,
    updatedAt: now,
  };
  await db.transactions.insertOne(doc);
  if (input.type === "SAVINGS" && input.journal) {
    await syncTransactionJournal(userId, { id: doc._id, description: doc.description, date: doc.date }, input.journal);
  }
  return getTransaction(userId, doc._id);
}

export async function updateTransaction(userId: string, id: string, rawInput: TransactionInput): Promise<Transaction> {
  const input = transactionInputSchema.parse(rawInput);
  await getTransaction(userId, id);
  await assertCategory(userId, input.categoryId, input.type);
  const db = await getDb();
  await db.transactions.updateOne(
    { _id: id, userId },
    {
      $set: {
        type: input.type,
        amount: input.amount,
        description: input.description,
        categoryId: input.categoryId,
        date: input.date,
        notes: input.notes,
        tags: normaliseTags(input.tags),
        updatedAt: new Date(),
      },
    },
  );
  if (input.type === "SAVINGS") {
    // undefined = the form did not touch the note; "" removes it.
    if (input.journal !== undefined) await syncTransactionJournal(userId, { id, description: input.description, date: input.date }, input.journal);
  } else {
    await unlinkTransactionJournal(userId, id);
  }
  return getTransaction(userId, id);
}

export async function deleteTransaction(userId: string, id: string): Promise<{ id: string; month: string }> {
  const existing = await getTransaction(userId, id);
  const db = await getDb();
  await db.transactions.deleteOne({ _id: id, userId });
  // The journal is history worth keeping: detach the note instead of deleting it.
  if (existing.type === "SAVINGS") await unlinkTransactionJournal(userId, id);
  return { id, month: monthKeyOf(existing.date) };
}

export async function duplicateTransaction(userId: string, id: string, overrides: { date?: IsoDate } = {}): Promise<Transaction> {
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
  return db.transactions.countDocuments({ userId });
}

export interface ClearDataOptions {
  /** Also delete custom categories and restore the defaults. */
  resetCategories?: boolean;
}

/** Delete every transaction and recurring rule for a user. */
export async function clearUserData(userId: string, options: ClearDataOptions = {}): Promise<{ transactions: number }> {
  const db = await getDb();
  const deleted = await db.transactions.deleteMany({ userId });
  await Promise.all([db.recurring.deleteMany({ userId }), db.savingsNotes.deleteMany({ userId })]);
  if (options.resetCategories) {
    await Promise.all([db.categories.deleteMany({ userId }), db.budgets.deleteMany({ userId }), db.savingsGoals.deleteMany({ userId })]);
  }
  return { transactions: deleted.deletedCount };
}
