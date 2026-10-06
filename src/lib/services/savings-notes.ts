import { getDb } from "@/lib/db";
import { newId, type SavingsNoteDoc } from "@/lib/db/schema";
import { AppError } from "@/lib/errors";
import { savingsNoteInputSchema, savingsNoteUpdateSchema, type SavingsNoteInput, type SavingsNoteUpdate } from "@/lib/validation/savings";
import type { IsoDate, SavingsNote } from "@/types";
import { toCategory } from "./categories";

/**
 * Savings journal: a notepad of what was done with savings. A note can stand alone or be linked
 * to one savings entry (the note written in the savings entry form). Only touches the notes
 * collection plus read-only lookups, so the entries service can use it without an import cycle.
 */

function isDuplicateKey(error: unknown): boolean {
  return (error as { code?: number }).code === 11000;
}

/** Journal text for the given savings entries, keyed by entry id. */
export async function journalsFor(userId: string, entryIds: string[]): Promise<Map<string, string>> {
  if (entryIds.length === 0) return new Map();
  const db = await getDb();
  const docs = await db.savingsNotes.find({ userId, entryId: { $in: entryIds } }, { projection: { entryId: 1, body: 1 } }).toArray();
  return new Map(docs.map((d) => [d.entryId!, d.body]));
}

/** Create, update or (with empty text) delete the note linked to a savings entry. */
export async function syncEntryJournal(userId: string, entry: { id: string; description: string; date: IsoDate }, text: string): Promise<void> {
  const db = await getDb();
  const body = text.trim();
  if (!body) {
    await db.savingsNotes.deleteOne({ userId, entryId: entry.id });
    return;
  }
  const now = new Date();
  await db.savingsNotes.updateOne(
    { userId, entryId: entry.id },
    {
      $set: { body, date: entry.date, title: entry.description.slice(0, 120), updatedAt: now },
      $setOnInsert: { _id: newId(), pinned: false, createdAt: now },
    },
    { upsert: true },
  );
}

/** Keep the note but detach it (its entry was deleted). */
export async function unlinkEntryJournal(userId: string, entryId: string): Promise<void> {
  const db = await getDb();
  await db.savingsNotes.updateMany({ userId, entryId }, { $set: { entryId: null, updatedAt: new Date() } });
}

async function toNotes(userId: string, docs: SavingsNoteDoc[]): Promise<SavingsNote[]> {
  const db = await getDb();
  const ids = docs.flatMap((d) => (d.entryId ? [d.entryId] : []));
  const entries = ids.length ? await db.savingsEntries.find({ userId, _id: { $in: ids } }).toArray() : [];
  const categoryIds = Array.from(new Set(entries.flatMap((e) => (e.categoryId ? [e.categoryId] : []))));
  const categories = categoryIds.length ? await db.categories.find({ userId, _id: { $in: categoryIds } }).toArray() : [];
  const categoryById = new Map(categories.map((c) => [c._id, c]));
  const entryById = new Map(entries.map((e) => [e._id, e]));
  return docs.map((doc) => {
    const linked = doc.entryId ? entryById.get(doc.entryId) : undefined;
    const category = linked?.categoryId ? categoryById.get(linked.categoryId) : undefined;
    return {
      id: doc._id,
      title: doc.title,
      body: doc.body,
      date: doc.date,
      pinned: doc.pinned,
      entryId: doc.entryId ?? null,
      entry: linked
        ? { id: linked._id, kind: linked.kind, amount: linked.amount, description: linked.description, date: linked.date, category: category ? toCategory(category) : null }
        : null,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  });
}

/** Pinned first, then newest. Optional case-insensitive search over title and body. */
export async function listSavingsNotes(userId: string, options: { q?: string; limit?: number } = {}): Promise<SavingsNote[]> {
  const db = await getDb();
  const filter: Record<string, unknown> = { userId };
  const q = options.q?.trim();
  if (q) {
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ title: regex }, { body: regex }];
  }
  const docs = await db.savingsNotes
    .find(filter)
    .sort({ pinned: -1, date: -1, createdAt: -1 })
    .limit(Math.min(Math.max(options.limit ?? 200, 1), 500))
    .toArray();
  return toNotes(userId, docs);
}

export async function countSavingsNotes(userId: string): Promise<number> {
  const db = await getDb();
  return db.savingsNotes.countDocuments({ userId });
}

export async function createSavingsNote(userId: string, rawInput: SavingsNoteInput): Promise<SavingsNote> {
  const input = savingsNoteInputSchema.parse(rawInput);
  const db = await getDb();
  if (input.entryId) {
    const entry = await db.savingsEntries.findOne({ _id: input.entryId, userId }, { projection: { _id: 1 } });
    if (!entry) throw AppError.notFound("Savings entry");
  }
  const now = new Date();
  const doc: SavingsNoteDoc = {
    _id: newId(),
    userId,
    title: input.title,
    body: input.body,
    date: input.date,
    pinned: input.pinned,
    entryId: input.entryId,
    createdAt: now,
    updatedAt: now,
  };
  try {
    await db.savingsNotes.insertOne(doc);
  } catch (error) {
    if (isDuplicateKey(error)) throw AppError.conflict("That savings entry already has a note. Edit it instead.");
    throw error;
  }
  const [note] = await toNotes(userId, [doc]);
  return note!;
}

export async function updateSavingsNote(userId: string, id: string, rawUpdate: SavingsNoteUpdate): Promise<SavingsNote> {
  const update = savingsNoteUpdateSchema.parse(rawUpdate);
  const db = await getDb();
  const $set: Partial<SavingsNoteDoc> = { updatedAt: new Date() };
  if (update.title !== undefined) $set.title = update.title;
  if (update.body !== undefined) $set.body = update.body;
  if (update.date !== undefined) $set.date = update.date;
  if (update.pinned !== undefined) $set.pinned = update.pinned;
  const doc = await db.savingsNotes.findOneAndUpdate({ _id: id, userId }, { $set }, { returnDocument: "after" });
  if (!doc) throw AppError.notFound("Note");
  const [note] = await toNotes(userId, [doc]);
  return note!;
}

export async function deleteSavingsNote(userId: string, id: string): Promise<void> {
  const db = await getDb();
  const result = await db.savingsNotes.deleteOne({ _id: id, userId });
  if (result.deletedCount === 0) throw AppError.notFound("Note");
}
