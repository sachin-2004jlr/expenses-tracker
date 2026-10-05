import { handleRoute, jsonOk } from "@/lib/api/http";
import { currentMonthKey, isValidMonthKey, todayIso } from "@/lib/dates";
import { getSavingsOverview } from "@/lib/services/savings";
import { getSettings } from "@/lib/services/settings";
import { getCurrentUserId } from "@/lib/services/user";

export const dynamic = "force-dynamic";

/** GET /api/savings?month=YYYY-MM → saved this month / all time, destinations, goals, recent entries. */
export async function GET(request: Request): Promise<Response> {
  return handleRoute(async () => {
    const userId = await getCurrentUserId();
    const { timeZone } = await getSettings(userId);
    const param = new URL(request.url).searchParams.get("month");
    const month = param && isValidMonthKey(param) ? param : currentMonthKey(timeZone);
    return jsonOk(await getSavingsOverview(userId, month, todayIso(timeZone)));
  });
}
