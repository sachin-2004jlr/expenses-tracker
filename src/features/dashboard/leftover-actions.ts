"use server";

import { revalidatePath } from "next/cache";
import { runAction, type ActionResult } from "@/lib/actions";
import { monthKeySchema } from "@/lib/validation/transaction";
import { markLeftoverHandled, moveLeftoverToSavings } from "@/lib/services/leftover";
import { getCurrentUserId } from "@/lib/services/user";

export async function moveLeftoverToSavingsAction(month: string): Promise<ActionResult<{ amount: number }>> {
  return runAction(async () => {
    const entry = await moveLeftoverToSavings(await getCurrentUserId(), monthKeySchema.parse(month));
    revalidatePath("/", "layout");
    return { amount: entry.amount };
  });
}

export async function dismissLeftoverAction(month: string): Promise<ActionResult<{ month: string }>> {
  return runAction(async () => {
    const key = monthKeySchema.parse(month);
    await markLeftoverHandled(await getCurrentUserId(), key);
    revalidatePath("/dashboard");
    return { month: key };
  });
}
