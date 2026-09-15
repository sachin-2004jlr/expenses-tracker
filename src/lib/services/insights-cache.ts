import { and, eq, inArray } from "drizzle-orm";
import { getDb, type Db } from "@/lib/db";
import { aiInsights } from "@/lib/db/schema";
import { nextMonthKey, previousMonthKey } from "@/lib/dates";
import type { MonthKey } from "@/types";

type Executor = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];

/**
 * Drop cached AI insights that could be affected by a change to transactions in `months`.
 * A change to September also invalidates October (its "previous month" comparison).
 * Insights are additionally guarded by a data hash, so this is belt-and-braces.
 */
export async function invalidateInsightsForMonths(
  userId: string,
  months: Iterable<MonthKey>,
  executor?: Executor,
): Promise<void> {
  const affected = new Set<MonthKey>();
  for (const month of months) {
    affected.add(month);
    affected.add(nextMonthKey(month));
    affected.add(previousMonthKey(month));
  }
  if (affected.size === 0) return;
  const db = executor ?? (await getDb());
  await db
    .delete(aiInsights)
    .where(and(eq(aiInsights.userId, userId), inArray(aiInsights.monthKey, Array.from(affected))));
}

export async function invalidateAllInsights(userId: string, executor?: Executor): Promise<void> {
  const db = executor ?? (await getDb());
  await db.delete(aiInsights).where(eq(aiInsights.userId, userId));
}
