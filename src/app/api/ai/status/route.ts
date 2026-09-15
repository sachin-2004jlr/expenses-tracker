import { getAiStatus } from "@/lib/ai/status";
import { handleRoute, jsonOk } from "@/lib/api/http";
import { getCurrentUserId } from "@/lib/services/user";

export const dynamic = "force-dynamic";

/** GET /api/ai/status → availability of the configured AI provider and its models. */
export async function GET(): Promise<Response> {
  return handleRoute(async () => {
    const userId = await getCurrentUserId();
    const status = await getAiStatus(userId);
    return jsonOk(status, { headers: { "cache-control": "no-store" } });
  });
}
