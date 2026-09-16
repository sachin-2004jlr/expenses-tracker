import { streamChatAnswer } from "@/lib/ai/chat";
import { clientIp, handleRoute, jsonError, readJson } from "@/lib/api/http";
import { AI_RATE_LIMIT, checkRateLimit } from "@/lib/api/rate-limit";
import { currentMonthKey } from "@/lib/dates";
import { getSettings } from "@/lib/services/settings";
import { getCurrentUserId } from "@/lib/services/user";
import { chatRequestSchema } from "@/lib/validation/ai";

export const dynamic = "force-dynamic";
// Keep within the Vercel Hobby plan's function limit.
export const maxDuration = 60;

/**
 * POST /api/ai/chat { messages, month } → streamed plain-text answer.
 * Response headers carry the deterministic context so the UI can show "computed by the app".
 */
export async function POST(request: Request): Promise<Response> {
  return handleRoute(async () => {
    const limit = checkRateLimit(`chat:${clientIp(request)}`, AI_RATE_LIMIT);
    if (!limit.ok) {
      return jsonError(429, "rate_limited", "Too many AI requests. Please wait a moment.", { retryAfterSeconds: limit.retryAfterSeconds });
    }
    const body = chatRequestSchema.parse(await readJson(request));
    const userId = await getCurrentUserId();
    const settings = await getSettings(userId);
    const month = body.month ?? currentMonthKey(settings.timeZone);

    const result = await streamChatAnswer(userId, body.messages, month);
    const encoder = new TextEncoder();
    const stream = result.stream.pipeThrough(
      new TransformStream<string, Uint8Array>({
        transform(chunk, controller) {
          controller.enqueue(encoder.encode(chunk));
        },
      }),
    );
    return new Response(stream, {
      status: 200,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
        "x-ai-intent": result.intent ?? "none",
        "x-ai-model": result.model ?? "",
        "x-ai-computed": result.computedAnswer ? "1" : "0",
      },
    });
  });
}
