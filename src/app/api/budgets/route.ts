import { revalidatePath } from "next/cache";
import { calculateBudgetProgress } from "@/lib/analytics/budgets";
import { getCategoryTotals } from "@/lib/analytics/queries";
import { handleRoute, jsonOk, readJson } from "@/lib/api/http";
import { currentMonthKey, isValidMonthKey, monthRange } from "@/lib/dates";
import { listBudgets, setBudget } from "@/lib/services/budgets";
import { listCategories } from "@/lib/services/categories";
import { getSettings } from "@/lib/services/settings";
import { getCurrentUserId } from "@/lib/services/user";
import { budgetInputSchema } from "@/lib/validation/budget";

export const dynamic = "force-dynamic";

/** GET /api/budgets?month=YYYY-MM → budgets with that month's progress (defaults to this month). */
export async function GET(request: Request): Promise<Response> {
  return handleRoute(async () => {
    const userId = await getCurrentUserId();
    const param = new URL(request.url).searchParams.get("month");
    const month = param && isValidMonthKey(param) ? param : currentMonthKey((await getSettings(userId)).timeZone);
    const { start, end } = monthRange(month);
    const [budgets, spending, categories] = await Promise.all([
      listBudgets(userId),
      getCategoryTotals(userId, "EXPENSE", start, end),
      listCategories(userId),
    ]);
    return jsonOk({ month, budgets, progress: calculateBudgetProgress(budgets, spending, categories) });
  });
}

/** PUT /api/budgets { categoryId, amount } (amount in paise; 0 removes the budget). */
export async function PUT(request: Request): Promise<Response> {
  return handleRoute(async () => {
    const input = budgetInputSchema.parse(await readJson(request));
    const userId = await getCurrentUserId();
    const budget = await setBudget(userId, input);
    revalidatePath("/", "layout");
    return jsonOk({ budget });
  });
}
