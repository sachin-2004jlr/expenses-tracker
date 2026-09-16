import { getDb } from "@/lib/db";
import type { Tag } from "@/types";

/**
 * Tags are embedded on each transaction (`tags: string[]`), so the tag "table" is derived.
 * Tag ids are the names themselves.
 */

export async function listTags(userId: string): Promise<Tag[]> {
  const db = await getDb();
  const names = (await db.transactions.distinct("tags", { userId })) as string[];
  return names
    .filter((name): name is string => typeof name === "string" && name.length > 0)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ id: name, name }));
}

/** Tags with usage counts, for filter UIs. */
export async function listTagsWithCounts(userId: string): Promise<(Tag & { count: number })[]> {
  const db = await getDb();
  const rows = await db.transactions
    .aggregate<{ _id: string; count: number }>([
      { $match: { userId, tags: { $exists: true, $ne: [] } } },
      { $unwind: "$tags" },
      { $group: { _id: "$tags", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ])
    .toArray();
  return rows.map((row) => ({ id: row._id, name: row._id, count: row.count }));
}

export function normaliseTags(names: Iterable<string>): string[] {
  return Array.from(new Set(Array.from(names).map((n) => n.trim().toLowerCase()).filter(Boolean)));
}
