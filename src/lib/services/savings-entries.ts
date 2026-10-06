import type { Filter } from "mongodb";
import { roundTo } from "@/lib/analytics/calculations";
import { savingsMonthlySeries } from "@/lib/analytics/savings";
import { getDb } from "@/lib/db";
import { newId, type CategoryDoc, type SavingsEntryDoc } from "@/lib/db/schema";
import { addDays, monthRange } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { savingsEntryInputSchema, type SavingsEntryFilters, type SavingsEntryInput } from "@/lib/validation/savings";
import type { CategoryBreakdownItem, MonthKey, SavingsEntry, SavingsEntryKind, SavingsMonth } from "@/types";
import { listCategories, toCategory } from "./categories";
import { journalsFor, syncEntryJournal, unlinkEntryJournal } from "./savings-notes";

/**
 * Savings entries: money added to savings (DEPOSIT) and what was done with it (SPEND).
 * Stored in their own collection so they never appear in, or change, the monthly tracker.
 */

const ADDED = { $sum: { $cond: [{ $eq: ["$kind", "DEPOSIT"] }, "$amount", 0] } };
const USED = { $sum: { $cond: [{ $eq: ["$kind", "SPEND"] }, "$amount", 0] } };

function toEntry(doc: SavingsEntryDoc, category: CategoryDoc | null, journal: string | null): SavingsEntry {
  return {
    id: doc._id,
    kind: doc.kind,
    amount: doc.amount,
    description: doc.description,
    categoryId: doc.categoryId,
    category: category ? toCategory(category) : null,
    date: doc.date,
    journal,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

async function hydrate(userId: string, docs: SavingsEntryDoc[]): Promise<SavingsEntry[]> {
  if (docs.length === 0) return [];
  const db = await getDb();
  const categoryIds = Array.from(new Set(docs.flatMap((d) => (d.categoryId ? [d.categoryId] : []))));
  const [categories, journals] = await Promise.all([
    categoryIds.length ? db.categories.find({ userId, _id: { $in: categoryIds } }).toArray() : Promise.resolve([] as CategoryDoc[]),
    journalsFor(
      userId,
      docs.map((d) => d._id),
    ),
  ]);
  const byId = new Map(categories.map((c) => [c._id, c]));
  return docs.map((doc) => toEntry(doc, doc.categoryId ? (byId.get(doc.categoryId) ?? null) : null, journals.get(doc._id) ?? null));
}

export interface SavingsEntryListResult {
  items: SavingsEntry[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  totals: { added: number; used: number; net: number };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function listSavingsEntries(userId: string, filters: SavingsEntryFilters): Promise<SavingsEntryListResult> {
  const db = await getDb();
  const match: Filter<SavingsEntryDoc> = { userId };
  if (filters.kind) match.kind = filters.kind;
  if (filters.month) {
    const { start, end } = monthRange(filters.month);
    match.date = { $gte: start, $lte: end };
  }
  if (filters.q) {
    const regex = new RegExp(escapeRegex(filters.q), "i");
    const categories = await db.categories.find({ userId, type: "SAVINGS", name: regex }).project<{ _id: string }>({ _id: 1 }).toArray();
    match.$or = [{ description: regex }, ...(categories.length ? [{ categoryId: { $in: categories.map((c) => c._id) } }] : [])];
  }
  const skip = (filters.page - 1) * filters.pageSize;
  const [docs, total, totals] = await Promise.all([
    db.savingsEntries.find(match).sort({ date: -1, createdAt: -1 }).skip(skip).limit(filters.pageSize).toArray(),
    db.savingsEntries.countDocuments(match),
    db.savingsEntries.aggregate<{ added: number; used: number }>([{ $match: match }, { $group: { _id: null, added: ADDED, used: USED } }]).toArray(),
  ]);
  const added = totals[0]?.added ?? 0;
  const used = totals[0]?.used ?? 0;
  return {
    items: await hydrate(userId, docs),
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    pageCount: Math.max(1, Math.ceil(total / filters.pageSize)),
    totals: { added, used, net: added - used },
  };
}

/** Every savings entry, newest first (exports). */
export async function listAllSavingsEntries(userId: string): Promise<SavingsEntry[]> {
  const db = await getDb();
  return hydrate(userId, await db.savingsEntries.find({ userId }).sort({ date: -1, createdAt: -1 }).toArray());
}

export async function getSavingsEntry(userId: string, id: string): Promise<SavingsEntry> {
  const db = await getDb();
  const doc = await db.savingsEntries.findOne({ _id: id, userId });
  if (!doc) throw AppError.notFound("Savings entry");
  const [entry] = await hydrate(userId, [doc]);
  return entry!;
}

async function assertSavingsCategory(userId: string, categoryId: string | null): Promise<void> {
  if (!categoryId) return;
  const db = await getDb();
  const category = await db.categories.findOne({ _id: categoryId, userId }, { projection: { type: 1 } });
  if (!category) throw AppError.badRequest("Choose a valid category");
  if (category.type !== "SAVINGS") throw AppError.badRequest("Choose a savings category");
}

export async function createSavingsEntry(userId: string, rawInput: SavingsEntryInput): Promise<SavingsEntry> {
  const input = savingsEntryInputSchema.parse(rawInput);
  await assertSavingsCategory(userId, input.categoryId);
  const db = await getDb();
  const now = new Date();
  const doc: SavingsEntryDoc = {
    _id: newId(),
    userId,
    kind: input.kind,
    amount: input.amount,
    description: input.description,
    categoryId: input.categoryId,
    date: input.date,
    createdAt: now,
    updatedAt: now,
  };
  await db.savingsEntries.insertOne(doc);
  if (input.journal) await syncEntryJournal(userId, { id: doc._id, description: doc.description, date: doc.date }, input.journal);
  return getSavingsEntry(userId, doc._id);
}

export async function updateSavingsEntry(userId: string, id: string, rawInput: SavingsEntryInput): Promise<SavingsEntry> {
  const input = savingsEntryInputSchema.parse(rawInput);
  await getSavingsEntry(userId, id);
  await assertSavingsCategory(userId, input.categoryId);
  const db = await getDb();
  await db.savingsEntries.updateOne(
    { _id: id, userId },
    { $set: { kind: input.kind, amount: input.amount, description: input.description, categoryId: input.categoryId, date: input.date, updatedAt: new Date() } },
  );
  if (input.journal !== undefined) await syncEntryJournal(userId, { id, description: input.description, date: input.date }, input.journal);
  return getSavingsEntry(userId, id);
}

export async function deleteSavingsEntry(userId: string, id: string): Promise<SavingsEntry> {
  const existing = await getSavingsEntry(userId, id);
  const db = await getDb();
  await db.savingsEntries.deleteOne({ _id: id, userId });
  // The journal is history worth keeping: detach the note instead of deleting it.
  await unlinkEntryJournal(userId, id);
  return existing;
}

/** "Add to savings" entries in a date range (amount and date only); they leave the monthly balance. */
export async function listSavingsDepositsInRange(userId: string, from: string, to: string): Promise<{ amount: number; date: string }[]> {
  const db = await getDb();
  return db.savingsEntries.find({ userId, kind: "DEPOSIT", date: { $gte: from, $lte: to } }, { projection: { _id: 0, amount: 1, date: 1 } }).toArray();
}

/** All-time (or ranged) money added, used and the resulting balance. */
export async function getSavingsTotals(userId: string, range: { from?: string; to?: string } = {}): Promise<{ added: number; used: number; balance: number }> {
  const db = await getDb();
  const match: Filter<SavingsEntryDoc> = { userId };
  if (range.from || range.to) match.date = { ...(range.from ? { $gte: range.from } : {}), ...(range.to ? { $lte: range.to } : {}) };
  const [row] = await db.savingsEntries.aggregate<{ added: number; used: number }>([{ $match: match }, { $group: { _id: null, added: ADDED, used: USED } }]).toArray();
  const added = row?.added ?? 0;
  const used = row?.used ?? 0;
  return { added, used, balance: added - used };
}

/** Month-by-month in / out with the running balance (opening balance from earlier months). */
export async function getSavingsSeries(userId: string, months: MonthKey[]): Promise<SavingsMonth[]> {
  if (months.length === 0) return [];
  const db = await getDb();
  const from = monthRange(months[0]!).start;
  const to = monthRange(months[months.length - 1]!).end;
  const [rows, opening] = await Promise.all([
    db.savingsEntries
      .aggregate<{ _id: string; added: number; used: number; count: number }>([
        { $match: { userId, date: { $gte: from, $lte: to } } },
        { $group: { _id: { $substrBytes: ["$date", 0, 7] }, added: ADDED, used: USED, count: { $sum: 1 } } },
      ])
      .toArray(),
    getSavingsTotals(userId, { to: addDays(from, -1) }),
  ]);
  return savingsMonthlySeries(
    rows.map((r) => ({ month: r._id, added: r.added, used: r.used, count: r.count })),
    months,
    opening.balance,
  );
}

/** Totals per savings category for one kind of entry over a date range. */
export async function getSavingsByCategory(userId: string, kind: SavingsEntryKind, range: { from?: string; to?: string } = {}): Promise<CategoryBreakdownItem[]> {
  const db = await getDb();
  const match: Filter<SavingsEntryDoc> = { userId, kind, categoryId: { $type: "string" } };
  if (range.from || range.to) match.date = { ...(range.from ? { $gte: range.from } : {}), ...(range.to ? { $lte: range.to } : {}) };
  const [rows, categories] = await Promise.all([
    db.savingsEntries.aggregate<{ _id: string; amount: number; count: number }>([{ $match: match }, { $group: { _id: "$categoryId", amount: { $sum: "$amount" }, count: { $sum: 1 } } }]).toArray(),
    listCategories(userId),
  ]);
  const lookup = new Map(categories.map((c) => [c.id, c]));
  const grand = rows.reduce((sum, r) => sum + r.amount, 0);
  return rows
    .map((row) => {
      const category = lookup.get(row._id);
      return {
        categoryId: row._id,
        name: category?.name ?? "Uncategorised",
        icon: category?.icon ?? "tag",
        color: category?.color ?? "slate",
        amount: row.amount,
        count: row.count,
        percentage: grand === 0 ? 0 : roundTo((row.amount / grand) * 100, 1),
      };
    })
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name));
}

type MigrationGlobals = { __expensesSavingsMigrated?: Set<string> };
const migrationGlobals = globalThis as unknown as MigrationGlobals;

/**
 * One-time move of savings recorded in the monthly tracker (the short-lived SAVINGS transaction
 * type) into the separate savings module. Entry ids are kept, so their journal notes stay linked.
 * Checked at most once per user per server instance.
 */
export async function migrateLegacySavings(userId: string): Promise<void> {
  const done = (migrationGlobals.__expensesSavingsMigrated ??= new Set());
  if (done.has(userId)) return;
  const db = await getDb();
  const legacyFilter = { userId, type: { $nin: ["INCOME", "EXPENSE"] } } as unknown as Filter<never>;
  const legacy = (await db.transactions.find(legacyFilter as never).toArray()) as unknown as Array<{
    _id: string;
    amount: number;
    description: string;
    categoryId: string;
    date: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  if (legacy.length > 0) {
    await db.savingsEntries
      .insertMany(
        legacy.map((t) => ({
          _id: t._id,
          userId,
          kind: "DEPOSIT" as const,
          amount: t.amount,
          description: t.description,
          categoryId: t.categoryId ?? null,
          date: t.date,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        })),
        { ordered: false },
      )
      .catch((error: unknown) => {
        if ((error as { code?: number }).code !== 11000) throw error;
      });
    await db.transactions.deleteMany(legacyFilter as never);
    await db.recurring.deleteMany(legacyFilter as never);
  }
  // Notes written before the split were linked by `transactionId`; the ids are now entry ids.
  await db.savingsNotes.updateMany({ userId, transactionId: { $exists: true } } as never, { $rename: { transactionId: "entryId" } } as never);
  done.add(userId);
}
