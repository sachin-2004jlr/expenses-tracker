"use server";

import { revalidatePath } from "next/cache";
import { runAction, type ActionResult } from "@/lib/actions";
import { setBudget } from "@/lib/services/budgets";
import { getCurrentUserId } from "@/lib/services/user";
import { budgetInputSchema, type BudgetInput } from "@/lib/validation/budget";
import type { Budget } from "@/types";

export async function setBudgetAction(input: BudgetInput): Promise<ActionResult<Budget | null>> {
  return runAction(async () => {
    const userId = await getCurrentUserId();
    const saved = await setBudget(userId, budgetInputSchema.parse(input));
    revalidatePath("/", "layout");
    return saved;
  });
}
