import { z } from "zod";
import type { AiInsight, FinancialHealth } from "@/types";

/**
 * Structured AI output. The model is asked for JSON; we validate it here and degrade to a
 * plain-text summary when the response is malformed, so bad model output never crashes the app.
 */

const HEALTH_VALUES: FinancialHealth[] = ["excellent", "good", "fair", "concerning", "unknown"];

const stringList = z
  .array(z.union([z.string(), z.number()]))
  .transform((items) =>
    items
      .map((item) => String(item).trim())
      .filter((item) => item.length > 0)
      .slice(0, 6),
  );

const healthSchema = z
  .string()
  .transform((value) => value.trim().toLowerCase())
  .pipe(z.enum(HEALTH_VALUES))
  .catch("unknown");

export const aiInsightSchema = z.object({
  summary: z.string().trim().min(1, "Summary is required"),
  highlights: stringList.catch([]),
  concerns: stringList.catch([]),
  recommendations: stringList.catch([]),
  financialHealth: healthSchema,
});

export interface ParsedInsight {
  insight: AiInsight;
  degraded: boolean;
}

/** Try hard to find a JSON object inside model output (handles ```json fences and chatter). */
export function extractJsonObject(text: string): unknown | null {
  const trimmed = text.trim();
  const candidates: string[] = [trimmed];
  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
  if (fence?.[1]) candidates.unshift(fence[1].trim());
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first !== -1 && last > first) candidates.push(trimmed.slice(first, last + 1));
  for (const candidate of candidates) {
    try {
      const parsed: unknown = JSON.parse(candidate);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    } catch {
      // try next candidate
    }
  }
  return null;
}

/**
 * Parse raw model output into a validated insight. Never throws.
 * If nothing usable is found the raw text becomes the summary and `degraded` is true.
 */
export function parseInsight(raw: string): ParsedInsight {
  const json = extractJsonObject(raw);
  if (json) {
    const result = aiInsightSchema.safeParse(json);
    if (result.success) return { insight: result.data, degraded: false };
  }
  const summary = raw.trim().replace(/```(?:json)?/g, "").trim();
  return {
    insight: {
      summary: summary.length > 0 ? summary.slice(0, 2000) : "The AI model returned an empty response.",
      highlights: [],
      concerns: [],
      recommendations: [],
      financialHealth: "unknown",
    },
    degraded: true,
  };
}

export const insightRequestSchema = z.object({
  kind: z.enum(["MONTHLY", "SPENDING", "COMPARISON"]).default("MONTHLY"),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Invalid month"),
  force: z.boolean().default(false),
});

export const chatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(4000),
      }),
    )
    .min(1)
    .max(30),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Invalid month").optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
