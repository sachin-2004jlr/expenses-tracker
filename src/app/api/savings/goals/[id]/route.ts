import { revalidatePath } from "next/cache";
import { z } from "zod";
import { handleRoute, jsonOk, readJson } from "@/lib/api/http";
import { deleteSavingsGoal, updateSavingsGoal } from "@/lib/services/savings";
import { getCurrentUserId } from "@/lib/services/user";
import { savingsGoalUpdateSchema } from "@/lib/validation/savings";

export const dynamic = "force-dynamic";

const idSchema = z.uuid("Invalid goal id");
type Context = { params: Promise<{ id: string }> };

/** PATCH /api/savings/goals/:id → partial update, including { archived: true }. */
export async function PATCH(request: Request, context: Context): Promise<Response> {
  return handleRoute(async () => {
    const { id } = await context.params;
    const update = savingsGoalUpdateSchema.parse(await readJson(request));
    const userId = await getCurrentUserId();
    const goal = await updateSavingsGoal(userId, idSchema.parse(id), update);
    revalidatePath("/", "layout");
    return jsonOk(goal);
  });
}

export async function DELETE(_request: Request, context: Context): Promise<Response> {
  return handleRoute(async () => {
    const { id } = await context.params;
    const userId = await getCurrentUserId();
    await deleteSavingsGoal(userId, idSchema.parse(id));
    revalidatePath("/", "layout");
    return jsonOk({ id });
  });
}
