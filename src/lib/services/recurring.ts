import { and, asc, eq, lte } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { categories, recurringTransactions, transactions, type CategoryRow, type RecurringTransactionRow } from "@/lib/db/schema";
import { addDays, compareIsoDates, monthKeyOf, todayIso } from "@/lib/dates";
import { nextOccurrenceOnOrAfter, occurrencesBetween } from "@/lib/dates/recurrence";
import { AppError } from "@/lib/errors";
import { recurringInputSchema, type RecurringInput } from "@/lib/validation/recurring";
import type { IsoDate, RecurringTransaction } from "@/types";
import { toCategory } from "./categories";
import { invalidateInsightsForMonths } from "./insights-cache";

function toRecurring(row: RecurringTransactionRow, category: CategoryRow): RecurringTransaction {
  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    currency: row.currency,
    description: row.description,
    categoryId: row.categoryId,
    category: toCategory(category),
    notes: row.notes,
    frequency: row.frequency,
    interval: row.interval,
    startDate: row.startDate,
    endDate: row.endDate,
    nextRunDate: row.nextRunDate,
    lastRunDate: row.lastRunDate,
    isActive: row.isActive,
  };
}

export async function listRecurring(userId: string): Promise<RecurringTransaction[]> {
  const db = await getDb();
  const rows = await db
    .select({ rule: recurringTransactions, category: categories })
    .from(recurringTransactions)
    .innerJoin(categories, eq(categories.id, recurringTransactions.categoryId))
    .where(eq(recurringTransactions.userId, userId))
    .orderBy(asc(recurringTransactions.nextRunDate), asc(recurringTransactions.description));
  return rows.map((r) => toRecurring(r.rule, r.category));
}

export async function getRecurring(userId: string, id: string): Promise<RecurringTransaction> {
  const db = await getDb();
  const rows = await db
    .select({ rule: recurringTransactions, category: categories })
    .from(recurringTransactions)
    .innerJoin(categories, eq(categories.id, recurringTransactions.categoryId))
    .where(and(eq(recurringTransactions.id, id), eq(recurringTransactions.userId, userId)))
    .limit(1);
  if (!rows[0]) throw AppError.notFound("Recurring transaction");
  return toRecurring(rows[0].rule, rows[0].category);
}

async function assertCategory(userId: string, categoryId: string, type: RecurringInput["type"]): Promise<void> {
  const db = await getDb();
  const rows = await db
    .select({ type: categories.type })
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
    .limit(1);
  if (!rows[0]) throw AppError.badRequest("Choose a valid category");
  if (rows[0].type !== type) throw AppError.badRequest("The category type must match the transaction type");
}

export async function createRecurring(userId: string, rawInput: RecurringInput): Promise<RecurringTransaction> {
  const input = recurringInputSchema.parse(rawInput);
  await assertCategory(userId, input.categoryId, input.type);
  const db = await getDb();
  const [row] = await db
    .insert(recurringTransactions)
    .values({
      userId,
      type: input.type,
      amount: input.amount,
      description: input.description,
      categoryId: input.categoryId,
      notes: input.notes,
      frequency: input.frequency,
      interval: input.interval,
      startDate: input.startDate,
      endDate: input.endDate,
      nextRunDate: input.startDate,
      isActive: input.isActive,
    })
    .returning({ id: recurringTransactions.id });
  return getRecurring(userId, row!.id);
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
  await db
    .update(recurringTransactions)
    .set({
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
    })
    .where(and(eq(recurringTransactions.id, id), eq(recurringTransactions.userId, userId)));
  return getRecurring(userId, id);
}

export async function setRecurringActive(userId: string, id: string, isActive: boolean): Promise<RecurringTransaction> {
  await getRecurring(userId, id);
  const db = await getDb();
  await db
    .update(recurringTransactions)
    .set({ isActive })
    .where(and(eq(recurringTransactions.id, id), eq(recurringTransactions.userId, userId)));
  return getRecurring(userId, id);
}

export async function deleteRecurring(userId: string, id: string): Promise<void> {
  await getRecurring(userId, id);
  const db = await getDb();
  // Generated transactions are kept; their recurring_id becomes null via ON DELETE SET NULL.
  await db.delete(recurringTransactions).where(and(eq(recurringTransactions.id, id), eq(recurringTransactions.userId, userId)));
}

export interface MaterialiseResult {
  created: number;
  rulesProcessed: number;
}

/**
 * Create the transactions that recurring rules are due for, up to and including `today`.
 * Idempotent: each rule advances its `nextRunDate` inside the same DB transaction.
 */
export async function materialiseDueRecurring(userId: string, today: IsoDate = todayIso()): Promise<MaterialiseResult> {
  const db = await getDb();
  const due = await db
    .select()
    .from(recurringTransactions)
    .where(
      and(
        eq(recurringTransactions.userId, userId),
        eq(recurringTransactions.isActive, true),
        lte(recurringTransactions.nextRunDate, today),
      ),
    );
  if (due.length === 0) return { created: 0, rulesProcessed: 0 };

  let created = 0;
  const touchedMonths = new Set<string>();

  await db.transaction(async (tx) => {
    for (const rule of due) {
      const dates = occurrencesBetween(
        rule.startDate,
        rule.frequency,
        rule.interval,
        rule.nextRunDate,
        today,
        rule.endDate,
      );
      if (dates.length > 0) {
        await tx.insert(transactions).values(
          dates.map((date) => ({
            userId,
            type: rule.type,
            amount: Number(rule.amount),
            currency: rule.currency,
            description: rule.description,
            categoryId: rule.categoryId,
            date,
            notes: rule.notes,
            recurringId: rule.id,
          })),
        );
        created += dates.length;
        for (const date of dates) touchedMonths.add(monthKeyOf(date));
      }
      const lastRun = dates.length > 0 ? dates[dates.length - 1]! : rule.lastRunDate;
      const nextRunDate = nextOccurrenceOnOrAfter(
        rule.startDate,
        rule.frequency,
        rule.interval,
        addDays(lastRun ?? rule.nextRunDate, 1),
      );
      const finished = rule.endDate !== null && compareIsoDates(nextRunDate, rule.endDate) > 0;
      await tx
        .update(recurringTransactions)
        .set({ nextRunDate, lastRunDate: lastRun ?? null, isActive: finished ? false : rule.isActive })
        .where(eq(recurringTransactions.id, rule.id));
    }
    if (touchedMonths.size > 0) await invalidateInsightsForMonths(userId, touchedMonths, tx);
  });

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
