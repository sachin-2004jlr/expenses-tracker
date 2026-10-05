import { z } from "zod";
import { CATEGORY_COLORS } from "@/lib/db/defaults";
import { MAX_PAISE } from "@/lib/money";
import { isoDateSchema } from "./transaction";

/** A savings journal (notepad) entry. */
export const savingsNoteInputSchema = z.object({
  title: z.string().trim().max(120, "Keep the title under 120 characters").default(""),
  body: z.string().trim().min(1, "Write something first").max(5000, "Keep the note under 5000 characters"),
  date: isoDateSchema,
  pinned: z.boolean().default(false),
  /** Link to one SAVINGS transaction (optional). */
  transactionId: z.uuid().nullish().transform((v) => v ?? null),
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

const goalColor = z.enum(CATEGORY_COLORS);

/** A savings target, optionally tied to a savings destination whose entries count towards it. */
export const savingsGoalInputSchema = z.object({
  name: z.string().trim().min(1, "Give the goal a name").max(60, "Keep the name under 60 characters"),
  targetAmount: z.number({ error: "Target is required" }).int().positive("Target must be greater than zero").max(MAX_PAISE, "Target is too large"),
  targetDate: isoDateSchema.nullish().transform((v) => v ?? null),
  categoryId: z.uuid("Choose a savings destination").nullish().transform((v) => v ?? null),
  color: goalColor.default("emerald"),
});
export type SavingsGoalInput = z.input<typeof savingsGoalInputSchema>;

export const savingsGoalUpdateSchema = savingsGoalInputSchema.partial().extend({ archived: z.boolean().optional() });
export type SavingsGoalUpdate = z.input<typeof savingsGoalUpdateSchema>;
