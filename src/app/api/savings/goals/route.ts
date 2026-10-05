import { revalidatePath } from "next/cache";
import { handleRoute, jsonCreated, jsonOk, readJson } from "@/lib/api/http";
import { todayIso } from "@/lib/dates";
import { createSavingsGoal, listGoalProgress } from "@/lib/services/savings";
import { getSettings } from "@/lib/services/settings";
import { getCurrentUserId } from "@/lib/services/user";
import { savingsGoalInputSchema } from "@/lib/validation/savings";

export const dynamic = "force-dynamic";

/** GET /api/savings/goals?archived=1 → goals with progress (saved, remaining, monthly amount needed). */
export async function GET(request: Request): Promise<Response> {
  return handleRoute(async () => {
    const userId = await getCurrentUserId();
    const includeArchived = new URL(request.url).searchParams.get("archived") === "1";
    const { timeZone } = await getSettings(userId);
    return jsonOk(await listGoalProgress(userId, todayIso(timeZone), { includeArchived }));
  });
}

/** POST /api/savings/goals { name, targetAmount (paise), targetDate?, categoryId?, color? } */
export async function POST(request: Request): Promise<Response> {
  return handleRoute(async () => {
    const input = savingsGoalInputSchema.parse(await readJson(request));
    const userId = await getCurrentUserId();
    const goal = await createSavingsGoal(userId, input);
    revalidatePath("/", "layout");
    return jsonCreated(goal);
  });
}
