import { getDashboardSummary } from "@/lib/analytics/queries";
import { AppError } from "@/lib/errors";
import { findInsight, saveInsight } from "@/lib/services/insights-cache";
import { getSettings } from "@/lib/services/settings";
import { aiInsightSchema, parseInsight } from "@/lib/validation/ai";
import type { AiInsightResult, DashboardSummary, InsightKind, MonthKey } from "@/types";
import { buildFacts, hashFacts } from "./facts";
import { buildInsightPrompt, INSIGHT_SYSTEM_PROMPT } from "./prompts";
import { isAIProviderError } from "./provider";
import { getAIProvider } from "./registry";

/**
 * Monthly AI insights with a database-backed cache.
 *
 * Flow: calculate facts (app code) -> hash them -> reuse the cached insight when the hash
 * matches -> otherwise ask the provider for JSON -> validate with Zod (degrade gracefully) -> store.
 * Cache entries are also deleted whenever transactions in the month change (see insights-cache.ts).
 */

export interface GetInsightOptions {
  force?: boolean;
  /** When true, never call the model; only return a cached insight (or null). */
  cacheOnly?: boolean;
  summary?: DashboardSummary;
}

export async function getCachedInsight(userId: string, kind: InsightKind, month: MonthKey): Promise<AiInsightResult | null> {
  const doc = await findInsight(userId, kind, month);
  if (!doc) return null;
  const parsed = aiInsightSchema.safeParse(doc.content);
  if (!parsed.success) return null;
  return {
    kind,
    month,
    insight: parsed.data,
    provider: doc.provider,
    model: doc.model,
    generatedAt: doc.updatedAt.toISOString(),
    cached: true,
    degraded: false,
  };
}

export async function getInsight(
  userId: string,
  kind: InsightKind,
  month: MonthKey,
  options: GetInsightOptions = {},
): Promise<AiInsightResult | null> {
  const settings = await getSettings(userId);
  const provider = getAIProvider(settings);
  const summary = options.summary ?? (await getDashboardSummary(userId, month));
  const facts = buildFacts(kind, summary);
  const modelForHash = settings.ollamaModel ?? process.env.OLLAMA_MODEL ?? null;
  const dataHash = hashFacts(facts, provider.id, modelForHash);

  if (!options.force) {
    const doc = await findInsight(userId, kind, month);
    if (doc && doc.dataHash === dataHash) {
      const parsed = aiInsightSchema.safeParse(doc.content);
      if (parsed.success) {
        return {
          kind,
          month,
          insight: parsed.data,
          provider: doc.provider,
          model: doc.model,
          generatedAt: doc.updatedAt.toISOString(),
          cached: true,
          degraded: false,
        };
      }
    }
  }

  if (options.cacheOnly) return null;

  if (!settings.aiEnabled) {
    throw new AppError(503, "ai_disabled", "AI features are turned off. Enable them in Settings → AI.");
  }
  if (summary.current.transactionCount === 0) {
    throw new AppError(400, "no_data", "There are no transactions in this month to analyse yet.");
  }

  let text: string;
  let model: string;
  try {
    const result = await provider.generate({
      system: INSIGHT_SYSTEM_PROMPT,
      prompt: buildInsightPrompt(kind, facts),
      json: true,
      temperature: 0.3,
    });
    text = result.text;
    model = result.model;
  } catch (error) {
    if (isAIProviderError(error)) {
      throw new AppError(503, "ai_unavailable", error.message);
    }
    throw new AppError(
      503,
      "ai_unavailable",
      provider.isLocal ? "Local AI is unavailable. Start Ollama to enable AI insights." : "The AI provider is unavailable right now.",
    );
  }

  const { insight, degraded } = parseInsight(text);

  // Only cache well-formed insights; degraded text is shown once but re-tried next time.
  if (!degraded) {
    await saveInsight({ userId, kind, monthKey: month, dataHash, provider: provider.id, model, content: insight });
  }

  return {
    kind,
    month,
    insight,
    provider: provider.id,
    model,
    generatedAt: new Date().toISOString(),
    cached: false,
    degraded,
  };
}
