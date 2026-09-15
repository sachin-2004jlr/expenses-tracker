"use server";

import { revalidatePath } from "next/cache";
import { testOllamaConnection } from "@/lib/ai/status";
import { runAction, type ActionResult } from "@/lib/actions";
import { createCategory, deleteCategory, updateCategory, type DeleteCategoryResult } from "@/lib/services/categories";
import { getSettings, updateSettings } from "@/lib/services/settings";
import { clearUserData } from "@/lib/services/transactions";
import { ensureUserDefaults, getCurrentUserId } from "@/lib/services/user";
import { getDb } from "@/lib/db";
import { categoryInputSchema, categoryUpdateSchema, type CategoryInput, type CategoryUpdate } from "@/lib/validation/category";
import { ollamaTestSchema, settingsUpdateSchema, type SettingsUpdate } from "@/lib/validation/settings";
import type { AiStatus, AppSettings, Category } from "@/types";

function refreshAll(): void {
  revalidatePath("/", "layout");
}

export async function updateSettingsAction(update: SettingsUpdate): Promise<ActionResult<AppSettings>> {
  return runAction(async () => {
    const userId = await getCurrentUserId();
    const settings = await updateSettings(userId, settingsUpdateSchema.parse(update));
    refreshAll();
    return settings;
  });
}

export async function testOllamaAction(url: string, model: string | null): Promise<ActionResult<AiStatus>> {
  return runAction(async () => {
    const parsed = ollamaTestSchema.parse({ url });
    return testOllamaConnection(parsed.url, model);
  });
}

export async function createCategoryAction(input: CategoryInput): Promise<ActionResult<Category>> {
  return runAction(async () => {
    const userId = await getCurrentUserId();
    const created = await createCategory(userId, categoryInputSchema.parse(input));
    refreshAll();
    return created;
  });
}

export async function updateCategoryAction(id: string, update: CategoryUpdate): Promise<ActionResult<Category>> {
  return runAction(async () => {
    const userId = await getCurrentUserId();
    const updated = await updateCategory(userId, id, categoryUpdateSchema.parse(update));
    refreshAll();
    return updated;
  });
}

export async function deleteCategoryAction(id: string, reassignTo?: string): Promise<ActionResult<DeleteCategoryResult>> {
  return runAction(async () => {
    const userId = await getCurrentUserId();
    const result = await deleteCategory(userId, id, reassignTo ? { reassignTo } : {});
    refreshAll();
    return result;
  });
}

export async function clearDataAction(options: { resetCategories: boolean }): Promise<ActionResult<{ transactions: number }>> {
  return runAction(async () => {
    const userId = await getCurrentUserId();
    const result = await clearUserData(userId, { resetCategories: options.resetCategories });
    if (options.resetCategories) {
      await ensureUserDefaults(await getDb(), userId);
    }
    await getSettings(userId);
    refreshAll();
    return result;
  });
}
