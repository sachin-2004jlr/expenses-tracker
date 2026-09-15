import { and, asc, eq, inArray, notInArray, sql } from "drizzle-orm";
import { getDb, type Db } from "@/lib/db";
import { tags, transactionTags } from "@/lib/db/schema";
import type { Tag } from "@/types";

type Executor = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];

export async function listTags(userId: string): Promise<Tag[]> {
  const db = await getDb();
  const rows = await db
    .select({ id: tags.id, name: tags.name })
    .from(tags)
    .where(eq(tags.userId, userId))
    .orderBy(asc(tags.name));
  return rows;
}

/** Tags with usage counts, for filter UIs. */
export async function listTagsWithCounts(userId: string): Promise<(Tag & { count: number })[]> {
  const db = await getDb();
  const rows = await db
    .select({
      id: tags.id,
      name: tags.name,
      count: sql<number>`cast(count(${transactionTags.transactionId}) as integer)`,
    })
    .from(tags)
    .leftJoin(transactionTags, eq(transactionTags.tagId, tags.id))
    .where(eq(tags.userId, userId))
    .groupBy(tags.id)
    .orderBy(asc(tags.name));
  return rows.map((row) => ({ ...row, count: Number(row.count) }));
}

/** Ensure every tag name exists for the user and return the matching ids (in input order). */
export async function ensureTags(executor: Executor, userId: string, names: string[]): Promise<Tag[]> {
  const unique = Array.from(new Set(names.map((n) => n.trim().toLowerCase()).filter(Boolean)));
  if (unique.length === 0) return [];
  await executor
    .insert(tags)
    .values(unique.map((name) => ({ userId, name })))
    .onConflictDoNothing();
  const rows = await executor
    .select({ id: tags.id, name: tags.name })
    .from(tags)
    .where(and(eq(tags.userId, userId), inArray(tags.name, unique)));
  const byName = new Map(rows.map((row) => [row.name, row]));
  return unique.map((name) => byName.get(name)!).filter(Boolean);
}

/** Replace the tag set of a transaction. */
export async function setTransactionTags(
  executor: Executor,
  userId: string,
  transactionId: string,
  names: string[],
): Promise<Tag[]> {
  const resolved = await ensureTags(executor, userId, names);
  const ids = resolved.map((tag) => tag.id);
  if (ids.length === 0) {
    await executor.delete(transactionTags).where(eq(transactionTags.transactionId, transactionId));
    return [];
  }
  await executor
    .delete(transactionTags)
    .where(and(eq(transactionTags.transactionId, transactionId), notInArray(transactionTags.tagId, ids)));
  await executor
    .insert(transactionTags)
    .values(ids.map((tagId) => ({ transactionId, tagId })))
    .onConflictDoNothing();
  return resolved;
}

/** Remove tags that are no longer attached to any transaction. */
export async function pruneUnusedTags(executor: Executor, userId: string): Promise<number> {
  const deleted = await executor
    .delete(tags)
    .where(
      and(
        eq(tags.userId, userId),
        sql`not exists (select 1 from ${transactionTags} where ${transactionTags.tagId} = ${tags.id})`,
      ),
    )
    .returning({ id: tags.id });
  return deleted.length;
}
