import { getDb } from "@/lib/db";
import { newId, type CategoryDoc, type RecurringDoc, type TransactionDoc } from "@/lib/db/schema";
import { AppError } from "@/lib/errors";
import { paiseToDecimalString } from "@/lib/money";
import { BACKUP_FORMAT, BACKUP_VERSION, validateBackup, type BackupFile, type ImportMode } from "@/lib/validation/import";
import type { Category, Transaction } from "@/types";
import { listCategories } from "./categories";
import { listRecurring } from "./recurring";
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
}

export async function exportBackup(userId: string): Promise<ExportedBackup> {
  const [cats, txs, recurring] = await Promise.all([listCategories(userId), listAllTransactions(userId), listRecurring(userId)]);
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

  const wanted = new Map<string, { name: string; type: "INCOME" | "EXPENSE"; icon: string; color: string }>();
  for (const c of backup.categories) wanted.set(catKey(c.type, c.name), { name: c.name.trim(), type: c.type, icon: c.icon, color: c.color });
  for (const t of backup.transactions) {
    const key = catKey(t.type, t.category);
    if (!wanted.has(key)) wanted.set(key, { name: t.category.trim(), type: t.type, icon: "tag", color: "slate" });
  }
  for (const r of backup.recurring) {
    const key = catKey(r.type, r.category);
    if (!wanted.has(key)) wanted.set(key, { name: r.category.trim(), type: r.type, icon: "tag", color: "slate" });
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

  return { mode, categoriesCreated: newCategories.length, transactionsImported, recurringImported, transactionsDeleted };
}
