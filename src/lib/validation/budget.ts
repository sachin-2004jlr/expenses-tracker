import { z } from "zod";
import { MAX_PAISE } from "@/lib/money";

/** Set a category's monthly budget. An amount of 0 removes the budget. */
export const budgetInputSchema = z.object({
  categoryId: z.uuid("Choose a category"),
  amount: z
    .number({ error: "Amount is required" })
    .int("Amount must be a whole number of paise")
    .min(0, "Budget cannot be negative")
    .max(MAX_PAISE, "Budget is too large"),
});

export type BudgetInput = z.infer<typeof budgetInputSchema>;
