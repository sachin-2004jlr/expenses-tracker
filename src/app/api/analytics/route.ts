import { z } from "zod";
import { getAnalyticsOverview, getMonthlySeries } from "@/lib/analytics/queries";
import { monthsForRange } from "@/lib/analytics/calculations";
import { handleRoute, jsonOk, searchParamsToObject } from "@/lib/api/http";
import { currentMonthKey, monthsBetween } from "@/lib/dates";
import { getAllTimeTotals } from "@/lib/analytics/queries";
import { getSettings } from "@/lib/services/settings";
import { getCurrentUserId } from "@/lib/services/user";
import { monthKeySchema } from "@/lib/validation/transaction";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  range: z.enum(["3m", "6m", "12m", "all"]).default("6m"),
  month: monthKeySchema.optional(),
  view: z.enum(["overview", "series"]).default("overview"),
});

/** GET /api/analytics?range=6m&month=2026-09&view=overview|series */
export async function GET(request: Request): Promise<Response> {
  return handleRoute(async () => {
    const query = querySchema.parse(searchParamsToObject(new URL(request.url)));
    const userId = await getCurrentUserId();
    const settings = await getSettings(userId);
    const endMonth = query.month ?? currentMonthKey(settings.timeZone);

    if (query.view === "series") {
      let months = monthsForRange(endMonth, query.range);
      if (months === null) {
        const totals = await getAllTimeTotals(userId);
        const first = totals.firstMonth ?? endMonth;
        months = monthsBetween(first < endMonth ? first : endMonth, endMonth).slice(-240);
      }
      const series = await getMonthlySeries(userId, months);
      return jsonOk({ range: query.range, months, series });
    }

    const overview = await getAnalyticsOverview(userId, query.range, endMonth);
    return jsonOk(overview);
  });
}
