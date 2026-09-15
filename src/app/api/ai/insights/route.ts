import { z } from "zod";
import { getCachedInsight, getInsight } from "@/lib/ai/insights";
import { clientIp, handleRoute, jsonError, jsonOk, readJson, searchParamsToObject } from "@/lib/api/http";
import { AI_RATE_LIMIT, checkRateLimit } from "@/lib/api/rate-limit";
import { getCurrentUserId } from "@/lib/services/user";
import { insightRequestSchema } from "@/lib/validation/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const getQuerySchema = z.object({
  kind: z.enum(["MONTHLY", "SPENDING", "COMPARISON"]).default("MONTHLY"),
  month: z.string().regex(/^\d{4}-\d{2}$/),
});

/** GET /api/ai/insights?kind=MONTHLY&month=2026-09 → cached insight or 204. */
export async function GET(request: Request): Promise<Response> {
  return handleRoute(async () => {
    const query = getQuerySchema.parse(searchParamsToObject(new URL(request.url)));
    const userId = await getCurrentUserId();
    const cached = await getCachedInsight(userId, query.kind, query.month);
    if (!cached) return new Response(null, { status: 204 });
    return jsonOk(cached);
  });
}

/** POST /api/ai/insights { kind, month, force } → generates (or reuses) an insight. */
export async function POST(request: Request): Promise<Response> {
  return handleRoute(async () => {
    const limit = checkRateLimit(`insights:${clientIp(request)}`, AI_RATE_LIMIT);
    if (!limit.ok) {
      return jsonError(429, "rate_limited", "Too many AI requests. Please wait a moment.", { retryAfterSeconds: limit.retryAfterSeconds });
    }
    const body = insightRequestSchema.parse(await readJson(request));
    const userId = await getCurrentUserId();
    const result = await getInsight(userId, body.kind, body.month, { force: body.force });
    if (!result) return new Response(null, { status: 204 });
    return jsonOk(result);
  });
}
