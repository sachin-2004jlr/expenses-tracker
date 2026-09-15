import type { AppSettings } from "@/types";
import { MockProvider } from "./mock";
import { OllamaProvider } from "./ollama";
import { OpenAICompatibleProvider } from "./openai-compatible";
import type { AIProvider } from "./provider";

/**
 * Provider registry: turns persisted settings (+ server env) into a concrete provider.
 *
 * Precedence:
 *  1. `AI_PROVIDER=mock` in the environment always wins (used by tests/CI).
 *  2. The provider chosen in Settings → AI.
 *
 * To add a new backend, implement `AIProvider` and add a case below. Nothing else changes.
 */
export function getAIProvider(settings: AppSettings): AIProvider {
  const enabled = settings.aiEnabled;
  if (process.env.AI_PROVIDER === "mock" || settings.aiProvider === "mock") {
    return new MockProvider({ enabled });
  }
  switch (settings.aiProvider) {
    case "openai-compatible":
      return new OpenAICompatibleProvider({
        baseUrl: process.env.OPENAI_COMPATIBLE_BASE_URL ?? "",
        apiKey: process.env.OPENAI_COMPATIBLE_API_KEY ?? null,
        model: process.env.OPENAI_COMPATIBLE_MODEL ?? null,
        enabled,
      });
    case "ollama":
    default:
      return new OllamaProvider({
        baseUrl: settings.ollamaUrl || process.env.OLLAMA_URL || "http://localhost:11434",
        model: settings.ollamaModel ?? process.env.OLLAMA_MODEL ?? null,
        enabled,
      });
  }
}

export const PROVIDER_LABELS: Record<AppSettings["aiProvider"], string> = {
  ollama: "Ollama (local)",
  "openai-compatible": "OpenAI-compatible API (server-configured)",
  mock: "Mock AI (testing)",
};
