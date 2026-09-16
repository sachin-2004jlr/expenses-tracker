import { getDb } from "@/lib/db";
import { newId, type CategoryDoc, type RecurringDoc, type TransactionDoc } from "@/lib/db/schema";
import { addDays, compareIsoDates, todayIso } from "@/lib/dates";
import { nextOccurrenceOnOrAfter, occurrencesBetween } from "@/lib/dates/recurrence";
import { AppError } from "@/lib/errors";
import { recurringInputSchema, type RecurringInput } from "@/lib/validation/recurring";
import type { IsoDate, RecurringTransaction } from "@/types";
import { toCategory } from "./categories";

function toRecurring(doc: RecurringDoc, category: CategoryDoc): RecurringTransaction {
  return {
    id: doc._id,
    type: doc.type,
    amount: doc.amount,
    currency: doc.currency,
    description: doc.description,
    categoryId: doc.categoryId,
    category: toCategory(category),
    notes: doc.notes,
    frequency: doc.frequency,
    interval: doc.interval,
    startDate: doc.startDate,
    endDate: doc.endDate,
    nextRunDate: doc.nextRunDate,
    lastRunDate: doc.lastRunDate,
    isActive: doc.isActive,
  };
}

async function hydrate(userId: string, docs: RecurringDoc[]): Promise<RecurringTransaction[]> {
  if (docs.length === 0) return [];
  const db = await getDb();
  const categories = await db.categories.find({ userId, _id: { $in: docs.map((d) => d.categoryId) } }).toArray();
  const byId = new Map(categories.map((c) => [c._id, c]));
  return docs.flatMap((doc) => {
    const category = byId.get(doc.categoryId);
    return category ? [toRecurring(doc, category)] : [];
  });
}

export async function listRecurring(userId: string): Promise<RecurringTransaction[]> {
  const db = await getDb();
  const docs = await db.recurring.find({ userId }).sort({ nextRunDate: 1, description: 1 }).toArray();
  return hydrate(userId, docs);
}

export async function getRecurring(userId: string, id: string): Promise<RecurringTransaction> {
  const db = await getDb();
  const doc = await db.recurring.findOne({ _id: id, userId });
  if (!doc) throw AppError.notFound("Recurring transaction");
  const [rule] = await hydrate(userId, [doc]);
  if (!rule) throw AppError.notFound("Recurring transaction");
  return rule;
}

async function assertCategory(userId: string, categoryId: string, type: RecurringInput["type"]): Promise<void> {
  const db = await getDb();
  const category = await db.categories.findOne({ _id: categoryId, userId }, { projection: { type: 1 } });
  if (!category) throw AppError.badRequest("Choose a valid category");
  if (category.type !== type) throw AppError.badRequest("The category type must match the transaction type");
}

export async function createRecurring(userId: string, rawInput: RecurringInput): Promise<RecurringTransaction> {
  const input = recurringInputSchema.parse(rawInput);
  await assertCategory(userId, input.categoryId, input.type);
  const db = await getDb();
  const now = new Date();
  const doc: RecurringDoc = {
    _id: newId(),
    userId,
    type: input.type,
    amount: input.amount,
    currency: "INR",
    description: input.description,
    categoryId: input.categoryId,
    notes: input.notes,
    frequency: input.frequency,
    interval: input.interval,
    startDate: input.startDate,
    endDate: input.endDate,
    nextRunDate: input.startDate,
    lastRunDate: null,
    isActive: input.isActive,
    createdAt: now,
    updatedAt: now,
  };
  await db.recurring.insertOne(doc);
  return getRecurring(userId, doc._id);
}

export async function updateRecurring(userId: string, id: string, rawInput: RecurringInput): Promise<RecurringTransaction> {
  const input = recurringInputSchema.parse(rawInput);
  const existing = await getRecurring(userId, id);
  await assertCategory(userId, input.categoryId, input.type);
  const resumeFrom = existing.lastRunDate ? addDays(existing.lastRunDate, 1) : input.startDate;
  const nextRunDate = nextOccurrenceOnOrAfter(
    input.startDate,
    input.frequency,
    input.interval,
    compareIsoDates(resumeFrom, input.startDate) > 0 ? resumeFrom : input.startDate,
  );
  const db = await getDb();
  await db.recurring.updateOne(
    { _id: id, userId },
    {
      $set: {
        type: input.type,
        amount: input.amount,
        description: input.description,
        categoryId: input.categoryId,
        notes: input.notes,
        frequency: input.frequency,
        interval: input.interval,
        startDate: input.startDate,
        endDate: input.endDate,
        nextRunDate,
        isActive: input.isActive,
        updatedAt: new Date(),
      },
    },
  );
  return getRecurring(userId, id);
}

export async function setRecurringActive(userId: string, id: string, isActive: boolean): Promise<RecurringTransaction> {
  await getRecurring(userId, id);
  const db = await getDb();
  await db.recurring.updateOne({ _id: id, userId }, { $set: { isActive, updatedAt: new Date() } });
  return getRecurring(userId, id);
}

export async function deleteRecurring(userId: string, id: string): Promise<void> {
  await getRecurring(userId, id);
  const db = await getDb();
  // Generated transactions are kept; they just lose the link to the rule.
  await db.transactions.updateMany({ userId, recurringId: id }, { $set: { recurringId: null } });
  await db.recurring.deleteOne({ _id: id, userId });
}

export interface MaterialiseResult {
  created: number;
  rulesProcessed: number;
}

/**
 * Create the transactions that recurring rules are due for, up to and including `today`.
 * Each rule's `nextRunDate` is advanced right after its transactions are inserted.
 */
export async function materialiseDueRecurring(userId: string, today: IsoDate = todayIso()): Promise<MaterialiseResult> {
  const db = await getDb();
  const due = await db.recurring.find({ userId, isActive: true, nextRunDate: { $lte: today } }).toArray();
  if (due.length === 0) return { created: 0, rulesProcessed: 0 };

  let created = 0;
  const now = new Date();

  for (const rule of due) {
    const dates = occurrencesBetween(rule.startDate, rule.frequency, rule.interval, rule.nextRunDate, today, rule.endDate);
    if (dates.length > 0) {
      const docs: TransactionDoc[] = dates.map((date) => ({
        _id: newId(),
        userId,
        type: rule.type,
        amount: rule.amount,
        currency: rule.currency,
        description: rule.description,
        categoryId: rule.categoryId,
        date,
        notes: rule.notes,
        tags: [],
        recurringId: rule._id,
        createdAt: now,
        updatedAt: now,
      }));
      await db.transactions.insertMany(docs);
      created += docs.length;
    }
    const lastRun = dates.length > 0 ? dates[dates.length - 1]! : rule.lastRunDate;
    const nextRunDate = nextOccurrenceOnOrAfter(rule.startDate, rule.frequency, rule.interval, addDays(lastRun ?? rule.nextRunDate, 1));
    const finished = rule.endDate !== null && compareIsoDates(nextRunDate, rule.endDate) > 0;
    await db.recurring.updateOne(
      { _id: rule._id },
      { $set: { nextRunDate, lastRunDate: lastRun ?? null, isActive: finished ? false : rule.isActive, updatedAt: now } },
    );
  }

  return { created, rulesProcessed: due.length };
}

type RecurringGlobals = { __expensesRecurringCheckedFor?: string };
const globals = globalThis as unknown as RecurringGlobals;

/** Run materialisation at most once per day per process (cheap guard for page loads). */
export async function materialiseRecurringOncePerDay(userId: string, today: IsoDate): Promise<void> {
  const key = `${userId}:${today}`;
  if (globals.__expensesRecurringCheckedFor === key) return;
  globals.__expensesRecurringCheckedFor = key;
  try {
    await materialiseDueRecurring(userId, today);
  } catch (error) {
    globals.__expensesRecurringCheckedFor = undefined;
    console.error("[recurring] materialisation failed", error);
  }
}
