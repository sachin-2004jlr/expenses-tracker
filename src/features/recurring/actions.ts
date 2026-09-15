"use server";

import { revalidatePath } from "next/cache";
import { runAction, type ActionResult } from "@/lib/actions";
import { todayIso } from "@/lib/dates";
import {
  createRecurring,
  deleteRecurring,
  materialiseDueRecurring,
  setRecurringActive,
  updateRecurring,
  type MaterialiseResult,
} from "@/lib/services/recurring";
import { getSettings } from "@/lib/services/settings";
import { getCurrentUserId } from "@/lib/services/user";
import { recurringInputSchema, type RecurringInput } from "@/lib/validation/recurring";
import type { RecurringTransaction } from "@/types";

function refreshAll(): void {
  revalidatePath("/", "layout");
}

export async function createRecurringAction(input: RecurringInput): Promise<ActionResult<RecurringTransaction>> {
  return runAction(async () => {
    const userId = await getCurrentUserId();
    const created = await createRecurring(userId, recurringInputSchema.parse(input));
    const settings = await getSettings(userId);
    await materialiseDueRecurring(userId, todayIso(settings.timeZone));
    refreshAll();
    return created;
  });
}

export async function updateRecurringAction(id: string, input: RecurringInput): Promise<ActionResult<RecurringTransaction>> {
  return runAction(async () => {
    const userId = await getCurrentUserId();
    const updated = await updateRecurring(userId, id, recurringInputSchema.parse(input));
    refreshAll();
    return updated;
  });
}

export async function toggleRecurringAction(id: string, isActive: boolean): Promise<ActionResult<RecurringTransaction>> {
  return runAction(async () => {
    const userId = await getCurrentUserId();
    const updated = await setRecurringActive(userId, id, isActive);
    refreshAll();
    return updated;
  });
}

export async function deleteRecurringAction(id: string): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await getCurrentUserId();
    await deleteRecurring(userId, id);
    refreshAll();
    return { id };
  });
}

/** Materialise everything that is due today (normally happens automatically on page load). */
export async function runRecurringNowAction(): Promise<ActionResult<MaterialiseResult>> {
  return runAction(async () => {
    const userId = await getCurrentUserId();
    const settings = await getSettings(userId);
    const result = await materialiseDueRecurring(userId, todayIso(settings.timeZone));
    refreshAll();
    return result;
  });
}
