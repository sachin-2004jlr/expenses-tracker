import { z } from "zod";
import { CATEGORY_COLORS } from "@/lib/db/defaults";
import { MAX_PAISE, parseMoney } from "@/lib/money";
import { isoDateSchema, monthKeySchema, paiseSchema } from "./transaction";

export const savingsEntryKindSchema = z.enum(["DEPOSIT", "SPEND"]);

/** Journal text written from the savings entry form ("what did you do with this money?"). */
export const journalTextSchema = z.string().trim().max(5000, "Keep the note under 5000 characters");

/** Server-side input for a savings entry (amount already in paise). */
export const savingsEntryInputSchema = z
  .object({
    kind: savingsEntryKindSchema,
    amount: paiseSchema,
    description: z.string().trim().min(1, "Description is required").max(200, "Keep the description under 200 characters"),
    categoryId: z.uuid("Choose a category").nullish().transform((v) => v ?? null),
    date: isoDateSchema,
    /** `undefined` leaves the linked note alone, "" removes it. */
    journal: journalTextSchema.optional(),
  })
  .refine((v) => v.kind === "DEPOSIT" || v.categoryId !== null, { message: "Choose what the money was used for", path: ["categoryId"] });
export type SavingsEntryInput = z.input<typeof savingsEntryInputSchema>;

/** Client form values: amount is the raw string typed by the user. */
export const savingsEntryFormSchema = z
  .object({
    kind: savingsEntryKindSchema,
    amount: z
      .string()
      .trim()
      .min(1, "Amount is required")
      .refine((value) => {
        const paise = parseMoney(value);
        return paise !== null && paise > 0;
      }, "Enter a valid amount greater than zero"),
    description: z.string().trim().min(1, "Description is required").max(200, "Keep the description under 200 characters"),
    categoryId: z.string(),
    date: isoDateSchema,
    journal: z.string().max(5000, "Keep the note under 5000 characters"),
  })
  .refine((v) => v.kind === "DEPOSIT" || v.categoryId.length > 0, { message: "Choose what the money was used for", path: ["categoryId"] });
export type SavingsEntryFormValues = z.infer<typeof savingsEntryFormSchema>;

export const savingsEntryFiltersSchema = z.object({
  kind: savingsEntryKindSchema.optional(),
  month: monthKeySchema.optional(),
  q: z.string().trim().max(100).optional().transform((v) => v || undefined),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});
export type SavingsEntryFilters = z.infer<typeof savingsEntryFiltersSchema>;

export function parseSavingsEntryFilters(params: Record<string, string | string[] | undefined>): SavingsEntryFilters {
  const flat: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(params)) flat[key] = Array.isArray(value) ? value[0] : value;
  const result = savingsEntryFiltersSchema.safeParse(flat);
  if (result.success) return result.data;
  const cleaned = { ...flat };
  for (const issue of result.error.issues) {
    const key = issue.path[0];
    if (typeof key === "string") delete cleaned[key];
  }
  return savingsEntryFiltersSchema.parse(cleaned);
}

/** A savings journal (notepad) entry. */
export const savingsNoteInputSchema = z.object({
  title: z.string().trim().max(120, "Keep the title under 120 characters").default(""),
  body: z.string().trim().min(1, "Write something first").max(5000, "Keep the note under 5000 characters"),
  date: isoDateSchema,
  pinned: z.boolean().default(false),
  /** Link to one savings entry (optional). */
  entryId: z.uuid().nullish().transform((v) => v ?? null),
});
export type SavingsNoteInput = z.input<typeof savingsNoteInputSchema>;

export const savingsNoteUpdateSchema = z
  .object({
    title: z.string().trim().max(120, "Keep the title under 120 characters"),
    body: z.string().trim().min(1, "Write something first").max(5000, "Keep the note under 5000 characters"),
    date: isoDateSchema,
    pinned: z.boolean(),
  })
  .partial();
export type SavingsNoteUpdate = z.input<typeof savingsNoteUpdateSchema>;

/** A savings target. Linked to a savings category it counts deposits earmarked for that category. */
export const savingsGoalInputSchema = z.object({
  name: z.string().trim().min(1, "Give the goal a name").max(60, "Keep the name under 60 characters"),
  targetAmount: z.number({ error: "Target is required" }).int().positive("Target must be greater than zero").max(MAX_PAISE, "Target is too large"),
  targetDate: isoDateSchema.nullish().transform((v) => v ?? null),
  categoryId: z.uuid("Choose a savings category").nullish().transform((v) => v ?? null),
  color: z.enum(CATEGORY_COLORS).default("emerald"),
});
export type SavingsGoalInput = z.input<typeof savingsGoalInputSchema>;

export const savingsGoalUpdateSchema = savingsGoalInputSchema.partial().extend({ archived: z.boolean().optional() });
export type SavingsGoalUpdate = z.input<typeof savingsGoalUpdateSchema>;
