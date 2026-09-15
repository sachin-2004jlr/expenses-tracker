import type { AiModelInfo, AiStatus } from "@/types";
import {
  AIProviderError,
  DEFAULT_GENERATE_TIMEOUT_MS,
  DEFAULT_STATUS_TIMEOUT_MS,
  unavailableStatus,
  withTimeout,
  type AIProvider,
  type ChatOptions,
  type GenerateOptions,
  type GenerateResult,
} from "./provider";

/**
 * Provider for any OpenAI-compatible chat API (OpenAI, Groq, Together, LM Studio, vLLM, ...).
 * Configured purely through server-side environment variables so keys never reach the browser:
 *   OPENAI_COMPATIBLE_BASE_URL, OPENAI_COMPATIBLE_API_KEY, OPENAI_COMPATIBLE_MODEL
 *
 * This is the extension point for hosted deployments where local Ollama is unreachable.
 */
export interface OpenAICompatibleOptions {
  baseUrl: string;
  apiKey: string | null;
  model: string | null;
  enabled?: boolean;
}

export class OpenAICompatibleProvider implements AIProvider {
  readonly id = "openai-compatible";
  readonly label = "OpenAI-compatible API";
  readonly isLocal: boolean;
  readonly endpoint: string;
  private readonly apiKey: string | null;
  private readonly model: string | null;
  private readonly enabled: boolean;

  constructor(options: OpenAICompatibleOptions) {
    this.endpoint = options.baseUrl.trim().replace(/\/+$/, "");
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.enabled = options.enabled ?? true;
    this.isLocal = /localhost|127\.0\.0\.1/.test(this.endpoint);
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (this.apiKey) headers.authorization = `Bearer ${this.apiKey}`;
    return headers;
  }

  async resolveModel(): Promise<string | null> {
    if (this.model) return this.model;
    const models = await this.listModels();
    return models[0]?.name ?? null;
  }

  async listModels(): Promise<AiModelInfo[]> {
    try {
      const response = await fetch(`${this.endpoint}/models`, {
        headers: this.headers(),
        signal: withTimeout(undefined, DEFAULT_STATUS_TIMEOUT_MS),
        cache: "no-store",
      });
      if (!response.ok) return this.model ? [{ name: this.model }] : [];
      const body = (await response.json()) as { data?: Array<{ id: string }> };
      return (body.data ?? []).map((m) => ({ name: m.id }));
    } catch {
      return this.model ? [{ name: this.model }] : [];
    }
  }

  async checkStatus(): Promise<AiStatus> {
    if (!this.enabled) return unavailableStatus(this, "AI features are turned off in Settings.", false);
    if (!this.endpoint) return unavailableStatus(this, "OPENAI_COMPATIBLE_BASE_URL is not configured on the server.");
    const models = await this.listModels();
    const selectedModel = await this.resolveModel();
    return {
      enabled: true,
      provider: this.id,
      providerLabel: this.label,
      available: Boolean(selectedModel),
      models,
      selectedModel,
      endpoint: this.endpoint,
      message: selectedModel ? null : "No model configured. Set OPENAI_COMPATIBLE_MODEL on the server.",
      checkedAt: new Date().toISOString(),
      isLocal: this.isLocal,
    };
  }

  async generate(options: GenerateOptions): Promise<GenerateResult> {
    const model = await this.resolveModel();
    if (!model) throw new AIProviderError("No model configured for the OpenAI-compatible provider.");
    let response: Response;
    try {
      response = await fetch(`${this.endpoint}/chat/completions`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({
          model,
          temperature: options.temperature ?? 0.3,
          max_tokens: options.maxTokens ?? 900,
          response_format: options.json ? { type: "json_object" } : undefined,
          messages: [
            { role: "system", content: options.system },
            { role: "user", content: options.prompt },
          ],
        }),
        signal: withTimeout(options.signal, DEFAULT_GENERATE_TIMEOUT_MS),
      });
    } catch (error) {
      throw new AIProviderError(`Could not reach ${this.endpoint}.`, { retryable: true, cause: error });
    }
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new AIProviderError(`AI API returned HTTP ${response.status}${text ? `: ${text.slice(0, 200)}` : ""}`);
    }
    const data = (await response.json()) as { model?: string; choices?: Array<{ message?: { content?: string } }> };
    return { text: data.choices?.[0]?.message?.content ?? "", model: data.model ?? model };
  }

  async streamChat(options: ChatOptions): Promise<ReadableStream<string>> {
    const model = await this.resolveModel();
    if (!model) throw new AIProviderError("No model configured for the OpenAI-compatible provider.");
    let response: Response;
    try {
      response = await fetch(`${this.endpoint}/chat/completions`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({
          model,
          stream: true,
          temperature: options.temperature ?? 0.4,
          max_tokens: options.maxTokens ?? 700,
          messages: [{ role: "system", content: options.system }, ...options.messages],
        }),
        signal: withTimeout(options.signal, DEFAULT_GENERATE_TIMEOUT_MS),
      });
    } catch (error) {
      throw new AIProviderError(`Could not reach ${this.endpoint}.`, { retryable: true, cause: error });
    }
    if (!response.ok || !response.body) {
      const text = await response.text().catch(() => "");
      throw new AIProviderError(`AI API returned HTTP ${response.status}${text ? `: ${text.slice(0, 200)}` : ""}`);
    }
    const decoder = new TextDecoder();
    let buffer = "";
    return response.body.pipeThrough(
      new TransformStream<Uint8Array, string>({
        transform(chunk, controller) {
          buffer += decoder.decode(chunk, { stream: true });
          let newline = buffer.indexOf("\n");
          while (newline !== -1) {
            const line = buffer.slice(0, newline).trim();
            buffer = buffer.slice(newline + 1);
            if (line.startsWith("data:")) {
              const payload = line.slice(5).trim();
              if (payload && payload !== "[DONE]") {
                try {
                  const json = JSON.parse(payload) as { choices?: Array<{ delta?: { content?: string } }> };
                  const text = json.choices?.[0]?.delta?.content;
                  if (text) controller.enqueue(text);
                } catch {
                  // ignore malformed SSE line
                }
              }
            }
            newline = buffer.indexOf("\n");
          }
        },
      }),
    );
  }
}
