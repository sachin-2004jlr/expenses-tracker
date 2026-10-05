import { getDb } from "@/lib/db";
import { newId, type SavingsNoteDoc } from "@/lib/db/schema";
import { AppError } from "@/lib/errors";
import {
  savingsNoteInputSchema,
  savingsNoteUpdateSchema,
  type SavingsNoteInput,
  type SavingsNoteUpdate,
} from "@/lib/validation/savings";
import type { IsoDate, SavingsNote } from "@/types";
import { toCategory } from "./categories";

/**
 * Savings journal: a notepad of what was done with saved money. A note can stand alone or be
 * linked to one SAVINGS transaction (the note written in the transaction form). This module
 * only touches the notes collection plus read-only lookups, so the transaction service can use
 * it without an import cycle.
 */

function isDuplicateKey(error: unknown): boolean {
  return (error as { code?: number }).code === 11000;
}

/** Journal text for the given transactions, keyed by transaction id. */
export async function journalsFor(userId: string, transactionIds: string[]): Promise<Map<string, string>> {
  if (transactionIds.length === 0) return new Map();
  const db = await getDb();
  const docs = await db.savingsNotes
    .find({ userId, transactionId: { $in: transactionIds } }, { projection: { transactionId: 1, body: 1 } })
    .toArray();
  return new Map(docs.map((d) => [d.transactionId!, d.body]));
}

/**
 * Create, update or (with empty text) delete the note linked to a savings transaction.
 * The note follows the transaction's date and uses its description as the title.
 */
export async function syncTransactionJournal(userId: string, tx: { id: string; description: string; date: IsoDate }, text: string): Promise<void> {
  const db = await getDb();
  const body = text.trim();
  if (!body) {
    await db.savingsNotes.deleteOne({ userId, transactionId: tx.id });
    return;
  }
  const now = new Date();
  await db.savingsNotes.updateOne(
    { userId, transactionId: tx.id },
    {
      $set: { body, date: tx.date, title: tx.description.slice(0, 120), updatedAt: now },
      $setOnInsert: { _id: newId(), pinned: false, createdAt: now },
    },
    { upsert: true },
  );
}

/** Keep the note but detach it (the entry was deleted or is no longer a savings entry). */
export async function unlinkTransactionJournal(userId: string, transactionId: string): Promise<void> {
  const db = await getDb();
  await db.savingsNotes.updateMany({ userId, transactionId }, { $set: { transactionId: null, updatedAt: new Date() } });
}

async function toNotes(userId: string, docs: SavingsNoteDoc[]): Promise<SavingsNote[]> {
  const db = await getDb();
  const ids = docs.flatMap((d) => (d.transactionId ? [d.transactionId] : []));
  const txs = ids.length ? await db.transactions.find({ userId, _id: { $in: ids } }).toArray() : [];
  const categoryIds = Array.from(new Set(txs.map((t) => t.categoryId)));
  const categories = categoryIds.length ? await db.categories.find({ userId, _id: { $in: categoryIds } }).toArray() : [];
  const categoryById = new Map(categories.map((c) => [c._id, c]));
  const txById = new Map(txs.map((t) => [t._id, t]));
  return docs.map((doc) => {
    const linked = doc.transactionId ? txById.get(doc.transactionId) : undefined;
    const category = linked ? categoryById.get(linked.categoryId) : undefined;
    return {
      id: doc._id,
      title: doc.title,
      body: doc.body,
      date: doc.date,
      pinned: doc.pinned,
      transactionId: doc.transactionId,
      transaction:
        linked && category
          ? { id: linked._id, amount: linked.amount, description: linked.description, date: linked.date, category: toCategory(category) }
          : null,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  });
}

export interface ListNotesOptions {
  q?: string;
  limit?: number;
}

/** Pinned first, then newest. Optional case-insensitive search over title and body. */
export async function listSavingsNotes(userId: string, options: ListNotesOptions = {}): Promise<SavingsNote[]> {
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

async function assertSavingsTransaction(userId: string, transactionId: string): Promise<{ date: string; description: string }> {
  const db = await getDb();
  const tx = await db.transactions.findOne({ _id: transactionId, userId }, { projection: { type: 1, date: 1, description: 1 } });
  if (!tx) throw AppError.notFound("Savings entry");
  if (tx.type !== "SAVINGS") throw AppError.badRequest("Notes can only be linked to savings entries");
  return tx;
}

export async function createSavingsNote(userId: string, rawInput: SavingsNoteInput): Promise<SavingsNote> {
  const input = savingsNoteInputSchema.parse(rawInput);
  if (input.transactionId) await assertSavingsTransaction(userId, input.transactionId);
  const db = await getDb();
  const now = new Date();
  const doc: SavingsNoteDoc = {
    _id: newId(),
    userId,
    title: input.title,
    body: input.body,
    date: input.date,
    pinned: input.pinned,
    transactionId: input.transactionId,
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
