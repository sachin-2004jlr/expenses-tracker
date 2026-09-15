import { getSettings } from "@/lib/services/settings";
import type { AiStatus } from "@/types";
import { OllamaProvider } from "./ollama";
import { getAIProvider } from "./registry";

/** Status of the configured provider (used by the dashboard card, settings and the assistant). */
export async function getAiStatus(userId: string): Promise<AiStatus> {
  const settings = await getSettings(userId);
  const provider = getAIProvider(settings);
  return provider.checkStatus();
}

/** Probe an arbitrary Ollama URL (Settings → AI → "Test connection") without saving it. */
export async function testOllamaConnection(url: string, model: string | null): Promise<AiStatus> {
  const provider = new OllamaProvider({ baseUrl: url, model });
  return provider.checkStatus();
}
