import { getDb } from "@/lib/db";
import { newId, type BudgetDoc, type CategoryDoc, type RecurringDoc, type SavingsGoalDoc, type SavingsNoteDoc, type TransactionDoc } from "@/lib/db/schema";
import { AppError } from "@/lib/errors";
import { paiseToDecimalString } from "@/lib/money";
import { BACKUP_FORMAT, BACKUP_VERSION, validateBackup, type BackupFile, type ImportMode } from "@/lib/validation/import";
import type { Category, Transaction } from "@/types";
import { listBudgets } from "./budgets";
import { listCategories } from "./categories";
import { listRecurring } from "./recurring";
import { listSavingsGoals } from "./savings";
import { listSavingsNotes } from "./savings-notes";
import { normaliseTags } from "./tags";
import { listAllTransactions } from "./transactions";
import { ensureUserDefaults } from "./user-identity";

/**
 * Backup export (JSON / CSV) and validated JSON import.
 * Amounts are exported as decimal rupee strings so files stay human-readable and spreadsheet-safe.
 */

export interface ExportedBackup {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  app: string;
  categories: Array<Pick<Category, "name" | "type" | "icon" | "color">>;
  transactions: Array<{
    type: Transaction["type"];
    amount: string;
    currency: string;
    description: string;
    category: string;
    date: string;
    notes: string | null;
    tags: string[];
  }>;
  recurring: Array<{
    type: Transaction["type"];
    amount: string;
    currency: string;
    description: string;
    category: string;
    notes: string | null;
    frequency: string;
    interval: number;
    startDate: string;
    endDate: string | null;
    nextRunDate: string;
    isActive: boolean;
  }>;
  budgets: Array<{ category: string; amount: string }>;
  savingsGoals: Array<{ name: string; targetAmount: string; targetDate: string | null; category: string | null; color: string; archived: boolean }>;
  savingsJournal: Array<{ title: string; body: string; date: string; pinned: boolean }>;
}

export async function exportBackup(userId: string): Promise<ExportedBackup> {
  const [cats, txs, recurring, budgets, goals, notes] = await Promise.all([
    listCategories(userId),
    listAllTransactions(userId),
    listRecurring(userId),
    listBudgets(userId),
    listSavingsGoals(userId, { includeArchived: true }),
    listSavingsNotes(userId, { limit: 500 }),
  ]);
  const categoryName = new Map(cats.map((c) => [c.id, c.name]));
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    app: "expenses-tracker",
    categories: cats.map((c) => ({ name: c.name, type: c.type, icon: c.icon, color: c.color })),
    transactions: txs.map((t) => ({
      type: t.type,
      amount: paiseToDecimalString(t.amount),
      currency: t.currency,
      description: t.description,
      category: t.category.name,
      date: t.date,
      notes: t.notes,
      tags: t.tags.map((tag) => tag.name),
    })),
    recurring: recurring.map((r) => ({
      type: r.type,
      amount: paiseToDecimalString(r.amount),
      currency: r.currency,
      description: r.description,
      category: r.category.name,
      notes: r.notes,
      frequency: r.frequency,
      interval: r.interval,
      startDate: r.startDate,
      endDate: r.endDate,
      nextRunDate: r.nextRunDate,
      isActive: r.isActive,
    })),
    budgets: budgets.flatMap((b) => {
      const category = categoryName.get(b.categoryId);
      return category ? [{ category, amount: paiseToDecimalString(b.amount) }] : [];
    }),
    savingsGoals: goals.map((g) => ({
      name: g.name,
      targetAmount: paiseToDecimalString(g.targetAmount),
      targetDate: g.targetDate,
      category: g.categoryId ? (categoryName.get(g.categoryId) ?? null) : null,
      color: g.color,
      archived: g.archived,
    })),
    savingsJournal: notes.map((n) => ({ title: n.title, body: n.body, date: n.date, pinned: n.pinned })),
  };
}

function csvEscape(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export async function exportCsv(userId: string): Promise<string> {
  const txs = await listAllTransactions(userId);
  const header = ["date", "type", "amount", "currency", "description", "category", "tags", "notes"];
  const lines = [header.join(",")];
  for (const t of txs) {
    lines.push(
      [
        t.date,
        t.type,
        paiseToDecimalString(t.amount),
        t.currency,
        csvEscape(t.description),
        csvEscape(t.category.name),
        csvEscape(t.tags.map((tag) => tag.name).join("; ")),
        csvEscape(t.notes),
      ].join(","),
    );
  }
  // BOM so Excel opens UTF-8 (₹, names) correctly.
  return `﻿${lines.join("\r\n")}\r\n`;
}

export interface ImportResult {
  mode: ImportMode;
  categoriesCreated: number;
  transactionsImported: number;
  recurringImported: number;
  transactionsDeleted: number;
}

/**
 * Import a validated backup. `merge` adds to existing data; `replace` wipes transactions and
 * recurring rules first (categories are kept and extended). The file is fully validated before
 * anything is written, so a malformed backup never touches the database.
 */
export async function importBackup(userId: string, raw: unknown, mode: ImportMode = "merge"): Promise<ImportResult> {
  const validation = validateBackup(raw);
  if (!validation.ok || !validation.data) {
    throw new AppError(400, "invalid_backup", "The backup file is invalid", validation.issues);
  }
  const backup: BackupFile = validation.data;
  const db = await getDb();
  const now = new Date();

  let transactionsDeleted = 0;
  if (mode === "replace") {
    const removed = await db.transactions.deleteMany({ userId });
    transactionsDeleted = removed.deletedCount;
    await db.recurring.deleteMany({ userId });
  }
  await ensureUserDefaults(db, userId);

  // Categories: existing by (type, lower(name)); create any that are missing.
  const existing = await db.categories.find({ userId }).toArray();
  const catKey = (type: string, name: string) => `${type}:${name.trim().toLowerCase()}`;
  const catMap = new Map(existing.map((c) => [catKey(c.type, c.name), c._id]));
  let sortOrder = existing.reduce((max, c) => Math.max(max, c.sortOrder), 0);

  const wanted = new Map<string, { name: string; type: Category["type"]; icon: string; color: string }>();
  for (const c of backup.categories) wanted.set(catKey(c.type, c.name), { name: c.name.trim(), type: c.type, icon: c.icon, color: c.color });
  for (const t of backup.transactions) {
    const key = catKey(t.type, t.category);
    if (!wanted.has(key)) wanted.set(key, { name: t.category.trim(), type: t.type, icon: "tag", color: "slate" });
  }
  for (const r of backup.recurring) {
    const key = catKey(r.type, r.category);
    if (!wanted.has(key)) wanted.set(key, { name: r.category.trim(), type: r.type, icon: "tag", color: "slate" });
  }
  for (const g of backup.savingsGoals) {
    if (!g.category) continue;
    const key = catKey("SAVINGS", g.category);
    if (!wanted.has(key)) wanted.set(key, { name: g.category.trim(), type: "SAVINGS", icon: "piggy-bank", color: "pink" });
  }
  for (const b of backup.budgets) {
    const key = catKey("EXPENSE", b.category);
    if (!wanted.has(key)) wanted.set(key, { name: b.category.trim(), type: "EXPENSE", icon: "tag", color: "slate" });
  }
  const newCategories: CategoryDoc[] = [];
  for (const [key, c] of wanted) {
    if (catMap.has(key)) continue;
    sortOrder += 1;
    const doc: CategoryDoc = {
      _id: newId(),
      userId,
      name: c.name,
      nameLower: c.name.toLowerCase(),
      type: c.type,
      icon: c.icon,
      color: c.color,
      isDefault: false,
      sortOrder,
      createdAt: now,
      updatedAt: now,
    };
    newCategories.push(doc);
    catMap.set(key, doc._id);
  }
  if (newCategories.length > 0) await db.categories.insertMany(newCategories);

  // Transactions (batched inserts)
  let transactionsImported = 0;
  const BATCH = 500;
  for (let i = 0; i < backup.transactions.length; i += BATCH) {
    const slice = backup.transactions.slice(i, i + BATCH);
    const docs: TransactionDoc[] = slice.map((t) => ({
      _id: newId(),
      userId,
      type: t.type,
      amount: t.amount,
      currency: t.currency,
      description: t.description,
      categoryId: catMap.get(catKey(t.type, t.category))!,
      date: t.date,
      notes: t.notes,
      tags: normaliseTags(t.tags),
      recurringId: null,
      createdAt: now,
      updatedAt: now,
    }));
    if (docs.length > 0) {
      const inserted = await db.transactions.insertMany(docs);
      transactionsImported += inserted.insertedCount;
    }
  }

  // Recurring rules
  let recurringImported = 0;
  if (backup.recurring.length > 0) {
    const docs: RecurringDoc[] = backup.recurring.map((r) => ({
      _id: newId(),
      userId,
      type: r.type,
      amount: r.amount,
      currency: r.currency,
      description: r.description,
      categoryId: catMap.get(catKey(r.type, r.category))!,
      notes: r.notes,
      frequency: r.frequency,
      interval: r.interval,
      startDate: r.startDate,
      endDate: r.endDate,
      nextRunDate: r.nextRunDate,
      lastRunDate: null,
      isActive: r.isActive,
      createdAt: now,
      updatedAt: now,
    }));
    const inserted = await db.recurring.insertMany(docs);
    recurringImported = inserted.insertedCount;
  }

  // Budgets: one per expense category; the backup's value wins over an existing one.
  if (backup.budgets.length > 0) {
    const byCategory = new Map<string, number>();
    for (const b of backup.budgets) byCategory.set(catMap.get(catKey("EXPENSE", b.category))!, b.amount);
    await db.budgets.bulkWrite(
      Array.from(byCategory, ([categoryId, amount]) => ({
        updateOne: {
          filter: { userId, categoryId },
          update: { $set: { amount, updatedAt: now }, $setOnInsert: { _id: newId(), createdAt: now } satisfies Partial<BudgetDoc> },
          upsert: true,
        },
      })),
    );
  }

  // Savings goals and journal notes (imported notes are unlinked; entry ids change on import).
  if (backup.savingsGoals.length > 0) {
    const goals: SavingsGoalDoc[] = backup.savingsGoals.map((g) => ({
      _id: newId(),
      userId,
      name: g.name,
      targetAmount: g.targetAmount,
      targetDate: g.targetDate,
      categoryId: g.category ? (catMap.get(catKey("SAVINGS", g.category)) ?? null) : null,
      color: g.color,
      archived: g.archived,
      createdAt: now,
      updatedAt: now,
    }));
    await db.savingsGoals.insertMany(goals);
  }
  if (backup.savingsJournal.length > 0) {
    const notes: SavingsNoteDoc[] = backup.savingsJournal.map((n) => ({
      _id: newId(),
      userId,
      title: n.title,
      body: n.body,
      date: n.date,
      pinned: n.pinned,
      transactionId: null,
      createdAt: now,
      updatedAt: now,
    }));
    await db.savingsNotes.insertMany(notes);
  }

  return { mode, categoriesCreated: newCategories.length, transactionsImported, recurringImported, transactionsDeleted };
}
