import { z } from "zod";
import { CATEGORY_COLORS, CATEGORY_ICONS } from "@/lib/db/defaults";
import { categoryTypeSchema } from "./transaction";

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(40, "Keep the name under 40 characters"),
  type: categoryTypeSchema,
  icon: z.enum(CATEGORY_ICONS).default("tag"),
  color: z.enum(CATEGORY_COLORS).default("slate"),
});

export type CategoryInput = z.infer<typeof categoryInputSchema>;

export const categoryUpdateSchema = categoryInputSchema.partial().extend({
  sortOrder: z.number().int().min(0).optional(),
});

export type CategoryUpdate = z.infer<typeof categoryUpdateSchema>;

/** When deleting a category with transactions, callers must say where those transactions go. */
export const categoryDeleteSchema = z.object({
  reassignTo: z.uuid().optional(),
});
