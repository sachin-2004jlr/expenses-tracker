import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { aiInsights, categories, recurringTransactions, tags, transactions, transactionTags } from "@/lib/db/schema";
import { AppError } from "@/lib/errors";
import { paiseToDecimalString } from "@/lib/money";
import { BACKUP_FORMAT, BACKUP_VERSION, validateBackup, type BackupFile, type ImportMode } from "@/lib/validation/import";
import type { Category, Transaction } from "@/types";
import { listCategories } from "./categories";
import { ensureTags } from "./tags";
import { listAllTransactions } from "./transactions";
import { listRecurring } from "./recurring";
import { ensureUserDefaults } from "./user";

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
 * Import a validated backup. `merge` adds to existing data; `replace` wipes transactions, tags
 * and recurring rules first (categories are kept and extended). Runs in one DB transaction so a
 * bad file never leaves the database half-imported.
 */
export async function importBackup(userId: string, raw: unknown, mode: ImportMode = "merge"): Promise<ImportResult> {
  const validation = validateBackup(raw);
  if (!validation.ok || !validation.data) {
    throw new AppError(400, "invalid_backup", "The backup file is invalid", validation.issues);
  }
  const backup: BackupFile = validation.data;
  const db = await getDb();

  return db.transaction(async (tx) => {
    let transactionsDeleted = 0;
    if (mode === "replace") {
      const removed = await tx.delete(transactions).where(eq(transactions.userId, userId)).returning({ id: transactions.id });
      transactionsDeleted = removed.length;
      await tx.delete(tags).where(eq(tags.userId, userId));
      await tx.delete(recurringTransactions).where(eq(recurringTransactions.userId, userId));
    }
    await tx.delete(aiInsights).where(eq(aiInsights.userId, userId));
    await ensureUserDefaults(tx as unknown as Parameters<typeof ensureUserDefaults>[0], userId);

    // Categories: existing by (type, lower(name)); create any that are missing.
    const existing = await tx.select().from(categories).where(eq(categories.userId, userId));
    const catKey = (type: string, name: string) => `${type}:${name.trim().toLowerCase()}`;
    const catMap = new Map(existing.map((c) => [catKey(c.type, c.name), c.id]));
    let categoriesCreated = 0;
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
    for (const [key, c] of wanted) {
      if (catMap.has(key)) continue;
      sortOrder += 1;
      const [row] = await tx
        .insert(categories)
        .values({ userId, name: c.name, type: c.type, icon: c.icon, color: c.color, sortOrder })
        .returning({ id: categories.id });
      catMap.set(key, row!.id);
      categoriesCreated += 1;
    }

    // Tags
    const allTagNames = Array.from(new Set(backup.transactions.flatMap((t) => t.tags)));
    const tagRows = await ensureTags(tx, userId, allTagNames);
    const tagIdByName = new Map(tagRows.map((t) => [t.name, t.id]));

    // Transactions (batched inserts)
    let transactionsImported = 0;
    const BATCH = 500;
    for (let i = 0; i < backup.transactions.length; i += BATCH) {
      const slice = backup.transactions.slice(i, i + BATCH);
      const inserted = await tx
        .insert(transactions)
        .values(
          slice.map((t) => ({
            userId,
            type: t.type,
            amount: t.amount,
            currency: t.currency,
            description: t.description,
            categoryId: catMap.get(catKey(t.type, t.category))!,
            date: t.date,
            notes: t.notes,
          })),
        )
        .returning({ id: transactions.id });
      const links: { transactionId: string; tagId: string }[] = [];
      inserted.forEach((row, index) => {
        for (const name of slice[index]!.tags) {
          const tagId = tagIdByName.get(name);
          if (tagId) links.push({ transactionId: row.id, tagId });
        }
      });
      if (links.length > 0) await tx.insert(transactionTags).values(links).onConflictDoNothing();
      transactionsImported += inserted.length;
    }

    // Recurring rules
    let recurringImported = 0;
    if (backup.recurring.length > 0) {
      const rows = await tx
        .insert(recurringTransactions)
        .values(
          backup.recurring.map((r) => ({
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
            isActive: r.isActive,
          })),
        )
        .returning({ id: recurringTransactions.id });
      recurringImported = rows.length;
    }

    return { mode, categoriesCreated, transactionsImported, recurringImported, transactionsDeleted };
  });
}
