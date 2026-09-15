import { z } from "zod";
import { isoDateSchema, paiseSchema, transactionTypeSchema } from "./transaction";

export const recurrenceFrequencySchema = z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]);

export const recurringInputSchema = z
  .object({
    type: transactionTypeSchema,
    amount: paiseSchema,
    description: z.string().trim().min(1, "Description is required").max(200),
    categoryId: z.uuid("Choose a category"),
    notes: z.string().trim().max(2000).nullish().transform((v) => (v ? v : null)),
    frequency: recurrenceFrequencySchema,
    interval: z.number().int().min(1, "Interval must be at least 1").max(365).default(1),
    startDate: isoDateSchema,
    endDate: isoDateSchema.nullish().transform((v) => (v ? v : null)),
    isActive: z.boolean().default(true),
  })
  .refine((value) => !value.endDate || value.endDate >= value.startDate, {
    message: "End date must be after the start date",
    path: ["endDate"],
  });

export type RecurringInput = z.infer<typeof recurringInputSchema>;

export const recurringFormSchema = z.object({
  type: transactionTypeSchema,
  amount: z.string().trim().min(1, "Amount is required"),
  description: z.string().trim().min(1, "Description is required").max(200),
  categoryId: z.string().min(1, "Choose a category"),
  notes: z.string().max(2000),
  frequency: recurrenceFrequencySchema,
  interval: z.coerce.number().int().min(1).max(365),
  startDate: isoDateSchema,
  endDate: z.string(),
  isActive: z.boolean(),
});

export type RecurringFormValues = z.infer<typeof recurringFormSchema>;
