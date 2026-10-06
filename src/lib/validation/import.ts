import { z } from "zod";
import { CATEGORY_COLORS, CATEGORY_ICONS } from "@/lib/db/defaults";
import { savingsGoalInputSchema } from "./savings";
import { MAX_PAISE, parseMoney } from "@/lib/money";
import { categoryTypeSchema, isoDateSchema, tagNameSchema, transactionTypeSchema } from "./transaction";

/**
 * Backup file format (also what `Export JSON` produces).
 *
 * Amounts are exported as decimal rupee strings ("55000.00") so backups stay human readable,
 * and are converted back to integer paise on import. Any malformed row rejects the whole file.
 */

export const BACKUP_FORMAT = "expenses-tracker-backup";
export const BACKUP_VERSION = 1;

/** Accepts "55000.00", 55000, or a `{ paise: 5500000 }` object; normalises to paise. */
const importAmountSchema = z
  .union([
    z.string(),
    z.number(),
    z.object({ paise: z.number().int().min(0).max(MAX_PAISE) }),
  ])
  .transform((value, ctx) => {
    if (typeof value === "object") return value.paise;
    const paise = parseMoney(value);
    if (paise === null) {
      ctx.addIssue({ code: "custom", message: `Invalid amount: ${String(value)}` });
      return z.NEVER;
    }
    return paise;
  })
  .pipe(z.number().int().positive("Amount must be greater than zero").max(MAX_PAISE));

export const importCategorySchema = z.object({
  name: z.string().trim().min(1).max(40),
  type: categoryTypeSchema,
  icon: z.string().trim().max(40).optional().transform((v) => (v && (CATEGORY_ICONS as readonly string[]).includes(v) ? v : "tag")),
  color: z.string().trim().max(40).optional().transform((v) => (v && (CATEGORY_COLORS as readonly string[]).includes(v) ? v : "slate")),
});

export const importTransactionSchema = z.object({
  type: transactionTypeSchema,
  amount: importAmountSchema,
  currency: z.string().trim().length(3).toUpperCase().default("INR"),
  description: z.string().trim().min(1, "Description is required").max(200),
  category: z.string().trim().min(1, "Category is required").max(40),
  date: isoDateSchema,
  notes: z.string().trim().max(2000).nullish().transform((v) => (v ? v : null)),
  tags: z.array(tagNameSchema).max(10).default([]),
});

export const importRecurringSchema = z.object({
  type: transactionTypeSchema,
  amount: importAmountSchema,
  currency: z.string().trim().length(3).toUpperCase().default("INR"),
  description: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(40),
  notes: z.string().trim().max(2000).nullish().transform((v) => (v ? v : null)),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]),
  interval: z.number().int().min(1).max(365).default(1),
  startDate: isoDateSchema,
  endDate: isoDateSchema.nullish().transform((v) => (v ? v : null)),
  nextRunDate: isoDateSchema,
  isActive: z.boolean().default(true),
});

export const importBudgetSchema = z.object({
  category: z.string().trim().min(1).max(40),
  amount: importAmountSchema,
});

export const importSavingsGoalSchema = z.object({
  name: savingsGoalInputSchema.shape.name,
  targetAmount: importAmountSchema,
  targetDate: isoDateSchema.nullish().transform((v) => v ?? null),
  category: z.string().trim().min(1).max(40).nullish().transform((v) => v ?? null),
  color: z.string().trim().max(40).optional().transform((v) => (v && (CATEGORY_COLORS as readonly string[]).includes(v) ? (v as (typeof CATEGORY_COLORS)[number]) : "emerald")),
  archived: z.boolean().default(false),
});

export const importSavingsEntrySchema = z.object({
  kind: z.enum(["DEPOSIT", "SPEND"]),
  amount: importAmountSchema,
  description: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(40).nullish().transform((v) => v ?? null),
  date: isoDateSchema,
  journal: z.string().trim().max(5000).nullish().transform((v) => (v ? v : null)),
});

export const importSavingsNoteSchema = z.object({
  title: z.string().trim().max(120).default(""),
  body: z.string().trim().min(1).max(5000),
  date: isoDateSchema,
  pinned: z.boolean().default(false),
});

export const backupFileSchema = z.object({
  format: z.literal(BACKUP_FORMAT, { error: "This file is not an Expenses Tracker backup" }),
  version: z.number().int().min(1).max(BACKUP_VERSION),
  exportedAt: z.string().optional(),
  categories: z.array(importCategorySchema).max(500).default([]),
  transactions: z.array(importTransactionSchema).max(100_000),
  recurring: z.array(importRecurringSchema).max(1000).default([]),
  budgets: z.array(importBudgetSchema).max(500).default([]),
  savingsEntries: z.array(importSavingsEntrySchema).max(50_000).default([]),
  savingsGoals: z.array(importSavingsGoalSchema).max(200).default([]),
  savingsJournal: z.array(importSavingsNoteSchema).max(5000).default([]),
});

export type BackupFile = z.infer<typeof backupFileSchema>;
export type ImportTransaction = z.infer<typeof importTransactionSchema>;
export type ImportCategory = z.infer<typeof importCategorySchema>;

export const importModeSchema = z.enum(["merge", "replace"]);
export type ImportMode = z.infer<typeof importModeSchema>;

export interface ImportIssue {
  path: string;
  message: string;
}

export interface ImportValidation {
  ok: boolean;
  data?: BackupFile;
  issues: ImportIssue[];
}

/** Validate a parsed JSON value and return either the typed backup or a readable issue list. */
export function validateBackup(raw: unknown): ImportValidation {
  const result = backupFileSchema.safeParse(raw);
  if (result.success) return { ok: true, data: result.data, issues: [] };
  const issues = result.error.issues.slice(0, 25).map((issue) => ({
    path: issue.path.length ? issue.path.map(String).join(".") : "(root)",
    message: issue.message,
  }));
  return { ok: false, issues };
}
