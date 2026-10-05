import { z } from "zod";
import { isValidIsoDate, isValidMonthKey } from "@/lib/dates";
import { MAX_PAISE, parseMoney } from "@/lib/money";

export const transactionTypeSchema = z.enum(["INCOME", "EXPENSE", "SAVINGS"]);

/** Savings journal text written from the transaction form ("what did you do with this money?"). */
export const journalTextSchema = z.string().trim().max(5000, "Keep the note under 5000 characters");

export const isoDateSchema = z
  .string()
  .refine((value) => isValidIsoDate(value), { message: "Enter a valid date (YYYY-MM-DD)" });

export const monthKeySchema = z
  .string()
  .refine((value) => isValidMonthKey(value), { message: "Enter a valid month (YYYY-MM)" });

/** Integer paise, strictly positive. */
export const paiseSchema = z
  .number({ error: "Amount is required" })
  .int("Amount must be a whole number of paise")
  .positive("Amount must be greater than zero")
  .max(MAX_PAISE, "Amount is too large");

export const tagNameSchema = z
  .string()
  .trim()
  .min(1, "Tag cannot be empty")
  .max(30, "Tags must be 30 characters or fewer")
  .regex(/^[\p{L}\p{N} _\-./&]+$/u, "Tags may only contain letters, numbers, spaces and - _ . / &")
  .transform((value) => value.toLowerCase());

export const tagListSchema = z
  .array(tagNameSchema)
  .max(10, "Up to 10 tags per transaction")
  .transform((list) => Array.from(new Set(list)));

/** Canonical server-side input for creating/updating a transaction (amount already in paise). */
export const transactionInputSchema = z.object({
  type: transactionTypeSchema,
  amount: paiseSchema,
  description: z.string().trim().min(1, "Description is required").max(200, "Keep the description under 200 characters"),
  categoryId: z.uuid("Choose a category"),
  date: isoDateSchema,
  notes: z.string().trim().max(2000, "Notes must be 2000 characters or fewer").nullish().transform((v) => (v ? v : null)),
  tags: tagListSchema.default([]),
  /**
   * SAVINGS only: journal text for the linked notepad entry. `undefined` leaves the note alone,
   * an empty string removes it.
   */
  journal: journalTextSchema.optional(),
});

export type TransactionInput = z.infer<typeof transactionInputSchema>;

/** Client form values: amount is the raw string typed by the user. */
export const transactionFormSchema = z.object({
  type: transactionTypeSchema,
  amount: z
    .string()
    .trim()
    .min(1, "Amount is required")
    .refine((value) => {
      const paise = parseMoney(value);
      return paise !== null && paise > 0;
    }, "Enter a valid amount greater than zero"),
  description: z.string().trim().min(1, "Description is required").max(200, "Keep the description under 200 characters"),
  categoryId: z.string().min(1, "Choose a category"),
  date: isoDateSchema,
  notes: z.string().max(2000, "Notes must be 2000 characters or fewer"),
  tags: z.array(z.string()).max(10, "Up to 10 tags per transaction"),
  journal: z.string().max(5000, "Keep the note under 5000 characters"),
});

export type TransactionFormValues = z.infer<typeof transactionFormSchema>;

export const sortFieldSchema = z.enum(["date", "amount", "description", "category", "createdAt"]);
export const sortDirectionSchema = z.enum(["asc", "desc"]);

const optionalMoney = z
  .string()
  .optional()
  .transform((value) => (value ? parseMoney(value) : null))
  .pipe(z.number().int().min(0).max(MAX_PAISE).nullable());

/** Query parameters accepted by the transactions list (URL search params / API). */
export const transactionFiltersSchema = z.object({
  q: z.string().trim().max(100).optional().transform((v) => v || undefined),
  type: transactionTypeSchema.optional(),
  category: z.string().uuid().optional(),
  month: monthKeySchema.optional(),
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
  min: optionalMoney,
  max: optionalMoney,
  tags: z
    .string()
    .optional()
    .transform((v) =>
      v
        ? v
            .split(",")
            .map((t) => t.trim().toLowerCase())
            .filter(Boolean)
        : [],
    ),
  sort: sortFieldSchema.default("date"),
  dir: sortDirectionSchema.default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

export type TransactionFilters = z.infer<typeof transactionFiltersSchema>;
export type TransactionFiltersInput = z.input<typeof transactionFiltersSchema>;

export function parseTransactionFilters(params: Record<string, string | string[] | undefined>): TransactionFilters {
  const flat: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(params)) {
    flat[key] = Array.isArray(value) ? value[0] : value;
  }
  const result = transactionFiltersSchema.safeParse(flat);
  if (result.success) return result.data;
  // Drop invalid keys one at a time rather than failing the whole page.
  const cleaned = { ...flat };
  for (const issue of result.error.issues) {
    const key = issue.path[0];
    if (typeof key === "string") delete cleaned[key];
  }
  return transactionFiltersSchema.parse(cleaned);
}
