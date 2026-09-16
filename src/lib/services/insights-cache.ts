import { getDb } from "@/lib/db";
import { newId, type AiInsightDoc } from "@/lib/db/schema";
import { nextMonthKey, previousMonthKey } from "@/lib/dates";
import type { AiInsight, InsightKind, MonthKey } from "@/types";

/**
 * Cached AI insights. A change to transactions in September also invalidates October (its
 * "previous month" comparison). Insights are additionally guarded by a data hash.
 */
export async function invalidateInsightsForMonths(userId: string, months: Iterable<MonthKey>): Promise<void> {
  const affected = new Set<MonthKey>();
  for (const month of months) {
    affected.add(month);
    affected.add(nextMonthKey(month));
    affected.add(previousMonthKey(month));
  }
  if (affected.size === 0) return;
  const db = await getDb();
  await db.insights.deleteMany({ userId, monthKey: { $in: Array.from(affected) } });
}

export async function invalidateAllInsights(userId: string): Promise<void> {
  const db = await getDb();
  await db.insights.deleteMany({ userId });
}

export async function findInsight(userId: string, kind: InsightKind, monthKey: MonthKey): Promise<AiInsightDoc | null> {
  const db = await getDb();
  return db.insights.findOne({ userId, kind, monthKey });
}

export async function saveInsight(input: {
  userId: string;
  kind: InsightKind;
  monthKey: MonthKey;
  dataHash: string;
  provider: string;
  model: string;
  content: AiInsight;
}): Promise<void> {
  const db = await getDb();
  const now = new Date();
  await db.insights.updateOne(
    { userId: input.userId, kind: input.kind, monthKey: input.monthKey },
    {
      $set: { dataHash: input.dataHash, provider: input.provider, model: input.model, content: input.content, updatedAt: now },
      $setOnInsert: { _id: newId(), createdAt: now },
    },
    { upsert: true },
  );
}
